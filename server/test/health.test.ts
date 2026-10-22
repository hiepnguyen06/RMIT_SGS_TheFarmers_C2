import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { loadConfig } from '../src/config.js';
import { testApp } from './helpers.js';

describe('health', () => {
  it('GET /health -> ok', async () => {
    const res = await request(testApp().app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
  it('requires TIDECLOAK_URL in tidecloak mode', () => {
    expect(() => loadConfig({ AUTH_MODE: 'tidecloak' })).toThrow();
  });
  it('defaults policy values', () => {
    const c = loadConfig({});
    expect([c.REFUND_LIMIT_VND, c.APPROVALS_REQUIRED, c.APPROVER_COUNT, c.PORT]).toEqual([500000, 1, 1, 4000]);
  });
});
