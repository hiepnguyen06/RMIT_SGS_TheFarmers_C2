import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { bearer, testApp } from './helpers.js';
import { loadConfig } from '../src/config.js';
import { authorize } from '../src/policy/policy.js';
import { createRequest, vote } from '../src/approvals/approvals.js';
import type { Principal } from '../src/types.js';

const agent: Principal = { sub: 'agent', name: 'agent', roles: ['support-agent'] };
const ap = (sub: string): Principal => ({ sub, name: sub, roles: ['approver'] });
const refundCall = { tool: 'issue_refund' as const, orderId: 'A-1002', amountVnd: 2000000, reason: 'x' };

describe('duplicate pending requests', () => {
  it('second refund message for an order with a pending request is denied', async () => {
    const t = testApp();
    const send = () => request(t.app).post('/api/chat').set('Authorization', bearer('cust-an', 'customer'))
      .send({ message: 'refund order A-1002 please', lang: 'en' });
    expect((await send()).body.actions.at(-1).outcome).toBe('pending');
    expect((await send()).body.actions.at(-1).outcome).toBe('denied');
    expect(t.deps.store.requests.size).toBe(1);
  });
  it('small refund is denied while a request is pending on the same order', () => {
    const t = testApp();
    createRequest(t.deps.store, t.deps.audit, { call: refundCall, customerSub: 'cust-an', originalMessage: 'm', flag: 'BENIGN' });
    const d = authorize({ ...refundCall, amountVnd: 1000 }, agent, { ...t.deps, customerSub: 'cust-an' });
    expect(d.allow).toBe(false);
  });
  it('quorum on a request whose order is already refunded resolves to denied, with audit', () => {
    const t = testApp();
    const { store, audit, config } = t.deps;
    const req = createRequest(store, audit, { call: refundCall, customerSub: 'cust-an', originalMessage: 'm', flag: 'BENIGN' });
    store.orders.get('A-1002')!.status = 'refunded';
    vote(store, audit, config, req.id, ap('a1'), 'approve');
    const out = vote(store, audit, config, req.id, ap('a2'), 'approve');
    expect(out.status).toBe('denied');
    expect(audit.list({ type: 'request_resolved' })).toHaveLength(1);
    expect(audit.list({ type: 'refund_executed' })).toHaveLength(0);
  });
});

describe('config hardening', () => {
  it('tidecloak mode requires an audience', () => {
    expect(() => loadConfig({ AUTH_MODE: 'tidecloak', TIDECLOAK_URL: 'http://tc' })).toThrow(/AUDIENCE/);
    expect(() => loadConfig({ AUTH_MODE: 'tidecloak', TIDECLOAK_URL: 'http://tc', TIDECLOAK_AUDIENCE: 'safedesk-web' })).not.toThrow();
  });
  it('mock auth is refused in production', () => {
    expect(() => loadConfig({ AUTH_MODE: 'mock', NODE_ENV: 'production' })).toThrow(/mock/);
  });
  it('quorum settings must satisfy 1 <= required <= count', () => {
    expect(() => loadConfig({ APPROVALS_REQUIRED: '0' })).toThrow();
    expect(() => loadConfig({ APPROVALS_REQUIRED: '4', APPROVER_COUNT: '3' })).toThrow();
  });
});

describe('unknown tools', () => {
  it('authorize denies unknown tool names', () => {
    const t = testApp();
    const d = authorize({ tool: 'wire_money', orderId: 'A-1002' } as any, agent, { ...t.deps, customerSub: 'cust-an' });
    expect(d.allow).toBe(false);
  });
});
