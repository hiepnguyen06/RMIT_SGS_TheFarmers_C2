import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import type { Config } from './config.js';
import type { Store } from './store/store.js';
import type { AuditLog } from './audit/audit.js';
import type { Verifier } from './auth/jwt.js';
import type { Classifier } from './classifier/classifier.js';
import type { AgentEngine } from './agent/agent.js';
import type { Principal } from './types.js';
import { HttpError } from './types.js';
import { healthRouter } from './routes/health.js';
import { approvalsRouter } from './routes/approvals.js';
import { chatRouter } from './routes/chat.js';

export interface Deps {
  config: Config;
  store: Store;
  audit: AuditLog;
  verifier: Verifier;
  classifier: Classifier;
  agent: AgentEngine;
  /** The agent's own identity; `unsafe` is the contrast-demo admin identity. */
  agentIdentity: (unsafe?: boolean) => Promise<Principal>;
}

export function createApp(deps: Deps): Express {
  const app = express();
  app.use(cors({ origin: deps.config.APP_URL }));
  app.use(express.json());
  app.use(healthRouter);
  app.use(approvalsRouter(deps));
  app.use(chatRouter(deps));
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    console.error(err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'internal error' });
  });
  return app;
}
