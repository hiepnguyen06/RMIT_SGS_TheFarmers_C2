import { Router } from 'express';
import { z } from 'zod';
import type { Deps } from '../app.js';
import { authenticate, requireRole } from '../auth/jwt.js';
import { vote } from '../approvals/approvals.js';
import { HttpError } from '../types.js';

export function approvalsRouter(deps: Deps) {
  const r = Router();
  r.use('/api/approvals', authenticate(deps.verifier), requireRole('approver'));

  r.get('/api/approvals', (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json([...deps.store.requests.values()].filter((x) => !status || x.status === status));
  });

  r.post('/api/approvals/:id/vote', (req, res) => {
    const body = z.object({ vote: z.enum(['approve', 'deny']) }).safeParse(req.body);
    if (!body.success) throw new HttpError(400, 'vote must be approve or deny');
    res.json(vote(deps.store, deps.audit, deps.config, String(req.params.id), req.principal!, body.data.vote));
  });
  return r;
}
