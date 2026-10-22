import type { RequestHandler } from 'express';
import type { Config } from '../config.js';
import { HttpError } from '../types.js';

/**
 * The shop is public: customers do not sign in. Every customer-facing request acts as one fixed
 * identity chosen by the server. Anything the client sends (an Authorization header, a name, an id)
 * is ignored, so a visitor can never act as another customer, an admin or the agent.
 */
export const publicCustomer =
  (config: Config): RequestHandler =>
  (req, _res, next) => {
    req.principal = { sub: config.PUBLIC_CUSTOMER_SUB, name: config.PUBLIC_CUSTOMER_NAME, roles: ['customer'] };
    next();
  };

const WINDOW_MS = 10 * 60 * 1000;

/** Fixed-window limiter per client address. In memory: correct for a single API process. */
export function rateLimit(limit: number, now: () => number = Date.now): RequestHandler {
  const hits = new Map<string, { start: number; n: number }>();
  return (req, _res, next) => {
    const t = now();
    for (const [k, v] of hits) if (t - v.start >= WINDOW_MS) hits.delete(k);
    const key = req.ip ?? 'unknown';
    const h = hits.get(key) ?? { start: t, n: 0 };
    h.n++;
    hits.set(key, h);
    if (h.n > limit) throw new HttpError(429, 'too many messages, please wait a few minutes');
    next();
  };
}
