import { describe, it, expect } from 'vitest';
import { createStore } from '../src/store/store.js';
import { AuditLog } from '../src/audit/audit.js';
import { seedOrders } from '../src/orders/orders.js';
import { authorize, executeRefund } from '../src/policy/policy.js';
import { loadConfig } from '../src/config.js';
import type { Principal, ToolCall } from '../src/types.js';

const agent: Principal = { sub: 'agent', name: 'agent', roles: ['support-agent'] };
const admin: Principal = { sub: 'adm', name: 'adm', roles: ['admin'] };
const customerOnly: Principal = { sub: 'cust-an', name: 'an', roles: ['customer'] };

function ctx(over: Record<string, unknown> = {}) {
  const store = createStore();
  seedOrders(store, ['cust-an', 'cust-binh']);
  const audit = new AuditLog(store);
  return { store, audit, config: loadConfig({}), customerSub: 'cust-an', ...over };
}
const refund = (orderId: string, amountVnd: unknown, reason = 'r'): ToolCall =>
  ({ tool: 'issue_refund', orderId, amountVnd: amountVnd as number, reason });

describe('authorize issue_refund', () => {
  it('exactly the limit executes; one above is pending', () => {
    const c = ctx();
    c.store.orders.get('A-1002')!.amountVnd = 2000000;
    expect(authorize(refund('A-1003', 480000), agent, c)).toEqual({ allow: true, mode: 'execute' });
    expect(authorize(refund('A-1002', 500000), agent, c)).toEqual({ allow: true, mode: 'execute' });
    expect(authorize(refund('A-1002', 500001), agent, c)).toEqual({ allow: true, mode: 'pending' });
  });
  it.each([[0], [-5], [1.5], ['100'], [NaN], [Infinity]])('rejects amount %s', (amt) => {
    const d = authorize(refund('A-1002', amt), agent, ctx());
    expect(d.allow).toBe(false);
  });
  it('rejects amount above order total', () => {
    expect(authorize(refund('A-1003', 480001), agent, ctx()).allow).toBe(false);
  });
  it('rejects another customer\'s order and unknown order', () => {
    expect(authorize(refund('B-2002', 1000), agent, ctx()).allow).toBe(false);
    expect(authorize(refund('Z-9', 1000), agent, ctx()).allow).toBe(false);
  });
  it('flagged messages force pending even for small refunds', () => {
    const d = authorize(refund('A-1003', 1000), agent, ctx({ flag: 'PROMPT_INJECTION' }));
    expect(d).toEqual({ allow: true, mode: 'pending' });
  });
  it('customer-only and admin-only actors are denied and audited', () => {
    for (const actor of [customerOnly, admin]) {
      const c = ctx();
      expect(authorize(refund('A-1003', 1000), actor, c).allow).toBe(false);
      expect(c.audit.list({ type: 'tool_denied' })).toHaveLength(1);
    }
  });
  it('already refunded order is denied', () => {
    const c = ctx();
    c.store.orders.get('A-1003')!.status = 'refunded';
    expect(authorize(refund('A-1003', 1000), agent, c).allow).toBe(false);
  });
});

describe('authorize get_order / executeRefund', () => {
  it('agent may read the acting customer\'s order only', () => {
    const c = ctx();
    expect(authorize({ tool: 'get_order', orderId: 'A-1001' }, agent, c).allow).toBe(true);
    expect(authorize({ tool: 'get_order', orderId: 'B-2001' }, agent, c).allow).toBe(false);
  });
  it('executeRefund marks refunded and audits', () => {
    const c = ctx();
    executeRefund(c.store, c.audit, refund('A-1003', 1000), 'agent');
    expect(c.store.orders.get('A-1003')!.status).toBe('refunded'
);
    expect(c.audit.list({ type: 'refund_executed' })).toHaveLength(1);
  });
});
