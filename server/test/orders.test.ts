import { describe, it, expect } from 'vitest';
import { createStore } from '../src/store/store.js';
import { getOrderOnBehalf, markRefunded, seedOrders } from '../src/orders/orders.js';


function setup() {
  const s = createStore();
  seedOrders(s, ['cust-an', 'cust-binh']);
  return s;
}

describe('orders', () => {
  it('seed has small and large orders for two customers', () => {
    const s = setup();
    const all = [...s.orders.values()];
    expect(all.length).toBeGreaterThanOrEqual(5);
    expect(all.some((o) => o.amountVnd > 500000)).toBe(true);
    expect(all.some((o) => o.amountVnd <= 500000)).toBe(true);
    expect(new Set(all.map((o) => o.customerSub))).toEqual(new Set(['cust-an', 'cust-binh']));
  });
  it('on-behalf lookup is scoped to the customer', () => {
    const s = setup();
    const own = [...s.orders.values()].find((o) => o.customerSub === 'cust-an')!;
    expect(getOrderOnBehalf(s, 'cust-an', own.id)?.id).toBe(own.id);
    expect(getOrderOnBehalf(s, 'cust-binh', own.id)).toBeUndefined();
    expect(getOrderOnBehalf(s, 'cust-an', 'nope')).toBeUndefined();
  });
  it('cannot refund twice', () => {
    const s = setup();
    const id = [...s.orders.keys()][0];
    markRefunded(s, id);
    expect(s.orders.get(id)!.status).toBe('refunded');
    expect(() => markRefunded(s, id)).toThrow();
  });
});
