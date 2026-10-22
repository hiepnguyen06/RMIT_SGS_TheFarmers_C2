import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import type { Config } from './config.js';
import { HttpError } from './types.js';
import { healthRouter } from './routes/health.js';

export interface Deps {
  config: Config;
}

export function createApp(deps: Deps): Express {
  const app = express();
  app.use(cors({ origin: deps.config.APP_URL }));
  app.use(express.json());
  app.use(healthRouter);
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    console.error(err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'internal error' });
  });
  return app;
}
