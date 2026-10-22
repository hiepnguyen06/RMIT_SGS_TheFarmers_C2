import { Router } from 'express';
import type { Deps } from '../app.js';
import { authenticate, requireRole } from '../auth/jwt.js';
import { LANGS } from '../types.js';

export function adminRouter(deps: Deps) {
  const r = Router();

  r.get('/api/orders/mine', authenticate(deps.verifier), requireRole('customer'), (req, res) => {
    res.json([...deps.store.orders.values()].filter((o) => o.customerSub === req.principal!.sub));
  });

  r.use('/api/admin', authenticate(deps.verifier), requireRole('admin'));

  r.get('/api/admin/audit', (req, res) => {
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    res.json(deps.audit.list({ type }));
  });

  r.get('/api/admin/stats/blocked-by-language', (_req, res) => {
    const counts = Object.fromEntries(LANGS.map((l) => [l, 0])) as Record<string, number>;
    for (const e of deps.audit.list({ type: 'flag' })) {
      const lang = String(e.data.lang);
      if (lang in counts) counts[lang]++;
    }
    res.json(counts);
  });

  return r;
}
