import type { Store } from '../store/store.js';
import { HttpError, type Order, type Principal } from '../types.js';

export function seedOrders(store: Store, customerSubs: string[] = ['cust-an', 'cust-binh']): void {
  const [a, b = a] = customerSubs;
  const rows: [string, string, number, string][] = [
    ['A-1001', a, 250000, 'Cà phê Đắk Lắk 1kg'],
    ['A-1002', a, 2000000, 'Máy xay cà phê'],
    ['A-1003', a, 480000, 'Trà sen Tây Hồ'],
    ['B-2001', b, 900000, 'Bộ ấm trà gốm Bát Tràng'],
    ['B-2002', b, 120000, 'Nón lá'],
    ['B-2003', b, 3500000, 'Áo dài lụa'],
  ];
  for (const [id, customerSub, amountVnd, item] of rows) {
    store.orders.set(id, { id, customerSub, amountVnd, item, status: 'paid' });
  }
}

export function getOrderOnBehalf(store: Store, customerSub: string, orderId: string): Order | undefined {
  const o = store.orders.get(orderId);
  return o && o.customerSub === customerSub ? o : undefined;
}

export function getOrderFor(store: Store, who: Principal, orderId: string): Order | undefined {
  const o = store.orders.get(orderId);
  if (!o) return undefined;
  if (who.roles.includes('support-agent')) return o;
  return who.roles.includes('customer') && o.customerSub === who.sub ? o : undefined;
}

export function markRefunded(store: Store, orderId: string): void {
  const o = store.orders.get(orderId);
  if (!o) throw new HttpError(404, 'order not found');
  if (o.status === 'refunded') throw new HttpError(409, 'order already refunded');
  o.status = 'refunded';
  store.save();
}
