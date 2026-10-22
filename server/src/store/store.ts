import fs from 'node:fs';
import path from 'node:path';
import type { AuditEvent, Order, RefundRequest } from '../types.js';

export interface Store {
  orders: Map<string, Order>;
  requests: Map<string, RefundRequest>;
  audit: AuditEvent[];
  save(): void;
}

interface Snapshot {
  orders: Order[];
  requests: RefundRequest[];
  audit: AuditEvent[];
}

export function createStore(file?: string): Store {
  const store: Store = {
    orders: new Map(),
    requests: new Map(),
    audit: [],
    save() {
      if (!file) return;
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const snap: Snapshot = {
        orders: [...store.orders.values()],
        requests: [...store.requests.values()],
        audit: store.audit,
      };
      fs.writeFileSync(file, JSON.stringify(snap));
    },
  };
  if (file && fs.existsSync(file)) {
    const snap = JSON.parse(fs.readFileSync(file, 'utf8')) as Snapshot;
    snap.orders.forEach((o) => store.orders.set(o.id, o));
    snap.requests.forEach((r) => store.requests.set(r.id, r));
    store.audit = snap.audit;
  }
  return store;
}
