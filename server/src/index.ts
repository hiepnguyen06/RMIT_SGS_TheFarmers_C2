import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createStore } from './store/store.js';
import { AuditLog } from './audit/audit.js';
import { makeVerifier } from './auth/jwt.js';
import { seedOrders } from './orders/orders.js';

const config = loadConfig();
const store = createStore(config.DATA_FILE);
if (store.orders.size === 0) seedOrders(store);
const deps = { config, store, audit: new AuditLog(store), verifier: makeVerifier(config) };
createApp(deps).listen(config.PORT, () => console.log(`SafeDesk API on :${config.PORT} (auth: ${config.AUTH_MODE})`));
