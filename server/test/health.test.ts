import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

describe('health', () => {
  it('GET /health -> ok', async () => {
    const app = createApp({ config: loadConfig({}) });
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
  it('requires TIDECLOAK_URL in tidecloak mode', () => {
    expect(() => loadConfig({ AUTH_MODE: 'tidecloak' })).toThrow();
  });
  it('defaults policy values', () => {
    const c = loadConfig({});
    expect([c.REFUND_LIMIT_VND, c.APPROVALS_REQUIRED, c.APPROVER_COUNT, c.PORT]).toEqual([500000, 2, 3, 4000]);
  });
});
