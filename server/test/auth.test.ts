import { describe, it, expect } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { SignJWT, calculateJwkThumbprint, exportJWK, generateKeyPair, type JWK } from 'jose';
import { authenticate, makeVerifier, requireRole } from '../src/auth/jwt.js';
import { loadConfig } from '../src/config.js';
import type { Principal } from '../src/types.js';

function appWith(verifier: ReturnType<typeof makeVerifier>) {
  const app = express();
  app.get('/any', authenticate(verifier), (req, res) => res.json(req.principal));
  app.get('/adm', authenticate(verifier), requireRole('admin'), (_req, res) => res.json({ ok: 1 }));
  return app;
}

describe('mock auth', () => {
  const verifier = makeVerifier(loadConfig({ AUTH_MODE: 'mock' }));
  it('no header -> 401', async () => {
    expect((await request(appWith(verifier)).get('/any')).status).toBe(401);
  });
  it('customer -> 403 on admin route', async () => {
    const res = await request(appWith(verifier)).get('/adm').set('Authorization', 'Bearer mock:c1:customer');
    expect(res.status).toBe(403);
  });
  it('admin passes, unknown and removed roles dropped', async () => {
    const res = await request(appWith(verifier)).get('/adm').set('Authorization', 'Bearer mock:a1:admin,root,approver');
    expect(res.status).toBe(200);
    const who = await request(appWith(verifier)).get('/any').set('Authorization', 'Bearer mock:a1:admin,root,approver');
    expect((who.body as Principal).roles).toEqual(['admin']);
  });
  it('malformed mock token -> 401', async () => {
    const res = await request(appWith(verifier)).get('/any').set('Authorization', 'Bearer garbage');
    expect(res.status).toBe(401);
  });
});

describe('tidecloak auth (EdDSA + DPoP)', () => {
  const config = loadConfig({
    AUTH_MODE: 'tidecloak',
    TIDECLOAK_URL: 'http://tc.local',
    TIDECLOAK_REALM: 'safedesk',
    TIDECLOAK_AUDIENCE: 'safedesk-web',
  });
  const issuer = 'http://tc.local/realms/safedesk';
  const URL_ = 'http://api.local/any';

  async function setup() {
    const realm = await generateKeyPair('EdDSA');
    const client = await generateKeyPair('ES256');
    const clientJwk = await exportJWK(client.publicKey);
    const verifier = makeVerifier(config, { key: realm.publicKey });

    const token = async (
      o: { iss?: string; aud?: string; azp?: string; exp?: string; roles?: string[]; bound?: JWK | false } = {},
    ) =>
      new SignJWT({
        realm_access: { roles: o.roles ?? ['customer'] },
        preferred_username: 'bob',
        azp: o.azp ?? 'safedesk-web',
        ...(o.bound === false ? {} : { cnf: { jkt: await calculateJwkThumbprint(o.bound ?? clientJwk, 'sha256') } }),
      })
        .setProtectedHeader({ alg: 'EdDSA' })
        .setSubject('u1')
        .setIssuer(o.iss ?? issuer)
        .setAudience(o.aud ?? 'safedesk-web')
        .setExpirationTime(o.exp ?? '5m')
        .sign(realm.privateKey);

    const proof = (
      t: string,
      o: { method?: string; url?: string; jti?: string; signer?: typeof client.privateKey } = {},
    ) =>
      new SignJWT({
        htm: o.method ?? 'GET',
        htu: o.url ?? URL_,
        jti: o.jti ?? randomUUID(),
        ath: createHash('sha256').update(t).digest('base64url'),
      })
        .setProtectedHeader({ alg: 'ES256', typ: 'dpop+jwt', jwk: clientJwk })
        .setIssuedAt()
        .sign(o.signer ?? client.privateKey);

    const req = (t: string, p: string | null, scheme = 'DPoP') => {
      const h: Record<string, string> = { authorization: `${scheme} ${t}`, ...(p ? { dpop: p } : {}) };
      return { url: URL_, method: 'GET', headers: { get: (n: string) => h[n.toLowerCase()] ?? null } };
    };
    return { verifier, token, proof, req };
  }

  it('accepts a bound token with a valid proof and reads roles', async () => {
    const { verifier, token, proof, req } = await setup();
    const t = await token({ roles: ['customer', 'offline_access'] });
    expect(await verifier(t, req(t, await proof(t)))).toEqual({ sub: 'u1', name: 'bob', roles: ['customer'] });
  });

  it('rejects expired, wrong issuer, wrong audience, wrong client', async () => {
    const { verifier, token, proof, req } = await setup();
    for (const o of [{ exp: '-1m' }, { iss: 'http://evil' }, { aud: 'other' }, { azp: 'other-client' }]) {
      const t = await token(o);
      await expect(verifier(t, req(t, await proof(t)))).rejects.toThrow();
    }
  });

  it('rejects a bound token replayed as Bearer (the stolen-token case)', async () => {
    const { verifier, token, proof, req } = await setup();
    const t = await token();
    await expect(verifier(t, req(t, await proof(t), 'Bearer'))).rejects.toThrow(/DPoP/);
    await expect(verifier(t, req(t, null))).rejects.toThrow(/DPoP/);
  });

  it('rejects an unbound token when a proof is required', async () => {
    const { verifier, token, req } = await setup();
    const t = await token({ bound: false });
    await expect(verifier(t, req(t, null))).rejects.toThrow(/cnf\.jkt/);
  });

  it('rejects a proof from a key the token is not bound to', async () => {
    const { verifier, token, proof, req } = await setup();
    const t = await token();
    const attacker = await generateKeyPair('ES256');
    const forged = await proof(t, { signer: attacker.privateKey });
    await expect(verifier(t, req(t, forged))).rejects.toThrow();
  });

  it('rejects a proof for another method or URL, and a replayed jti', async () => {
    const { verifier, token, proof, req } = await setup();
    const t = await token();
    await expect(verifier(t, req(t, await proof(t, { method: 'POST' })))).rejects.toThrow(/htm/);
    await expect(verifier(t, req(t, await proof(t, { url: 'http://api.local/other' })))).rejects.toThrow(/htu/);
    const once = await proof(t, { jti: 'same' });
    await verifier(t, req(t, once));
    await expect(verifier(t, req(t, once))).rejects.toThrow(/replay/);
  });

  it('rejects a token not signed with EdDSA, or signed by another key', async () => {
    const { verifier, req } = await setup();
    const rsa = await generateKeyPair('RS256');
    const mk = (alg: string, key: typeof rsa.privateKey) =>
      new SignJWT({ azp: 'safedesk-web' })
        .setProtectedHeader({ alg })
        .setSubject('x')
        .setIssuer(issuer)
        .setAudience('safedesk-web')
        .setExpirationTime('5m')
        .sign(key);
    const rs = await mk('RS256', rsa.privateKey);
    await expect(verifier(rs, req(rs, null))).rejects.toThrow();
    const other = await generateKeyPair('EdDSA');
    await expect(verifier(await mk('EdDSA', other.privateKey))).rejects.toThrow();
  });

  it('without a request, checks the token only (agent verifying its own service token)', async () => {
    const { verifier, token } = await setup();
    const p = await verifier(await token({ bound: false, roles: ['support-agent'] }));
    expect(p.roles).toEqual(['support-agent']);
  });

  it('middleware: DPoP scheme + proof -> 200, Bearer replay -> 401', async () => {
    const { verifier, token, proof } = await setup();
    const t = await token({ roles: ['admin'] });
    const ok = await request(appWith(verifier))
      .get('/any')
      .set('Host', 'api.local')
      .set('Authorization', `DPoP ${t}`)
      .set('DPoP', await proof(t));
    expect(ok.status).toBe(200);
    const replay = await request(appWith(verifier)).get('/any').set('Host', 'api.local').set('Authorization', `Bearer ${t}`);
    expect(replay.status).toBe(401);
  });
});
