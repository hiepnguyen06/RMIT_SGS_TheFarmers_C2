import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createStore } from './store/store.js';
import { AuditLog } from './audit/audit.js';
import { makeVerifier } from './auth/jwt.js';
import { makeClassifier } from './classifier/classifier.js';
import { ruleAgent } from './agent/agent.js';
import { makeClaudeAgent, makeLlmClassifier } from './agent/claude.js';
import { makeAgentIdentity } from './agent/identity.js';
import { seedOrders } from './orders/orders.js';

const config = loadConfig();
const store = createStore(config.DATA_FILE);
if (store.orders.size === 0) seedOrders(store, config.SEED_CUSTOMER_SUBS?.split(','));
const verifier = makeVerifier(config);
const hasKey = !!config.ANTHROPIC_API_KEY;
const deps = {
  config,
  store,
  audit: new AuditLog(store),
  verifier,
  classifier: makeClassifier(config, hasKey ? makeLlmClassifier(config) : undefined),
  agent: hasKey ? makeClaudeAgent(config) : ruleAgent,
  agentIdentity: makeAgentIdentity(config, verifier),
};
createApp(deps).listen(config.PORT, () => console.log(`SafeDesk API on :${config.PORT} (auth: ${config.AUTH_MODE})`));
