import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { SignJWT, generateKeyPair } from 'jose';
import { authenticate, makeVerifier, requireRole } from '../src/auth/jwt.js';
import { loadConfig } from '../src/config.js';
import type { Principal } from '../src/types.js';

function appWith(verifier: ReturnType<typeof makeVerifier>) {
  const app = express();
  app.get('/any', authenticate(verifier), (req, res) => res.json(req.principal));
  app.get('/appr', authenticate(verifier), requireRole('approver'), (_req, res) => res.json({ ok: 1 }));
  return app;
}

describe('mock auth', () => {
  const verifier = makeVerifier(loadConfig({ AUTH_MODE: 'mock' }));
  it('no header -> 401', async () => {
    expect((await request(appWith(verifier)).get('/any')).status).toBe(401);
  });
  it('customer -> 403 on approver route', async () => {
    const res = await request(appWith(verifier)).get('/appr').set('Authorization', 'Bearer mock:c1:customer');
    expect(res.status).toBe(403);
  });
  it('approver passes, unknown roles dropped', async () => {
    const res = await request(appWith(verifier)).get('/appr').set('Authorization', 'Bearer mock:a1:approver,root');
    expect(res.status).toBe(200);
    const who = await request(appWith(verifier)).get('/any').set('Authorization', 'Bearer mock:a1:approver,root');
    expect((who.body as Principal).roles).toEqual(['approver']);
  });
  it('malformed mock token -> 401', async () => {
    const res = await request(appWith(verifier)).get('/any').set('Authorization', 'Bearer garbage');
    expect(res.status).toBe(401);
  });
});

describe('tidecloak auth', () => {
  const config = loadConfig({
    AUTH_MODE: 'tidecloak',
    TIDECLOAK_URL: 'http://tc.local',
    TIDECLOAK_REALM: 'safedesk',
    TIDECLOAK_AUDIENCE: 'safedesk-web',
  });
  const issuer = 'http://tc.local/realms/safedesk';
  async function setup() {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const verifier = makeVerifier(config, { key: publicKey });
    const sign = (o: { iss?: string; aud?: string; exp?: string; roles?: string[] } = {}) =>
      new SignJWT({ realm_access: { roles: o.roles ?? ['customer'] }, preferred_username: 'bob' })
        .setProtectedHeader({ alg: 'RS256' })
        .setSubject('u1')
        .setIssuer(o.iss ?? issuer)
        .setAudience(o.aud ?? 'safedesk-web')
        .setExpirationTime(o.exp ?? '5m')
        .sign(privateKey);
    return { verifier, sign };
  }
  it('accepts a valid token and reads roles', async () => {
    const { verifier, sign } = await setup();
    const p = await verifier(await sign({ roles: ['customer', 'offline_access'] }));
    expect(p).toEqual({ sub: 'u1', name: 'bob', roles: ['customer'] });
  });
  it('rejects expired, wrong issuer, wrong audience', async () => {
    const { verifier, sign } = await setup();
    await expect(verifier(await sign({ exp: '-1m' }))).rejects.toThrow();
    await expect(verifier(await sign({ iss: 'http://evil' }))).rejects.toThrow();
    await expect(verifier(await sign({ aud: 'other' }))).rejects.toThrow();
  });
  it('rejects a token signed by another key -> 401 via middleware', async () => {
    const { verifier } = await setup();
    const other = await generateKeyPair('RS256');
    const forged = await new SignJWT({}).setProtectedHeader({ alg: 'RS256' }).setSubject('x').setIssuer(issuer).setAudience('safedesk-web').setExpirationTime('5m').sign(other.privateKey);
    const res = await request(appWith(verifier)).get('/any').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });
});
