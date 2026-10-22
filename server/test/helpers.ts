import { createApp, type Deps } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createStore } from '../src/store/store.js';
import { AuditLog } from '../src/audit/audit.js';
import { makeVerifier } from '../src/auth/jwt.js';
import { seedOrders } from '../src/orders/orders.js';

export const bearer = (sub: string, roles: string) => `Bearer mock:${sub}:${roles}`;

/** App wired with mock auth and seeded orders; override any dep. */
export function testApp(over: Partial<Deps> = {}, env: Record<string, string> = {}) {
  const config = loadConfig({ AUTH_MODE: 'mock', ...env });
  const store = createStore();
  seedOrders(store, ['cust-an', 'cust-binh']);
  const audit = new AuditLog(store);
  const deps = { config, store, audit, verifier: makeVerifier(config), ...over } as Deps;
  return { app: createApp(deps), deps };
}
