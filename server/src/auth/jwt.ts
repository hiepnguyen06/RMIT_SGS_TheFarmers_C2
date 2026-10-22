import type { RequestHandler } from 'express';
import { createRemoteJWKSet, jwtVerify, type CryptoKey, type KeyObject } from 'jose';
import type { Config } from '../config.js';
import { ROLES, type Principal, type Role } from '../types.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      principal?: Principal;
    }
  }
}

export type Verifier = (token: string) => Promise<Principal>;

const knownRoles = (roles: unknown): Role[] =>
  Array.isArray(roles) ? ROLES.filter((r) => roles.includes(r)) : [];

export function makeVerifier(config: Config, opts: { key?: CryptoKey | KeyObject } = {}): Verifier {
  if (config.AUTH_MODE === 'mock') {
    return async (token) => {
      const m = /^mock:([^:]+):([^:]*)$/.exec(token);
      if (!m) throw new Error('bad mock token');
      return { sub: m[1], name: m[1], roles: knownRoles(m[2].split(',')) };
    };
  }
  const issuer = `${config.TIDECLOAK_URL!.replace(/\/$/, '')}/realms/${config.TIDECLOAK_REALM}`;
  const jwks = opts.key ? undefined : createRemoteJWKSet(new URL(`${issuer}/protocol/openid-connect/certs`));
  return async (token) => {
    const verifyOpts = { issuer, ...(config.TIDECLOAK_AUDIENCE ? { audience: config.TIDECLOAK_AUDIENCE } : {}) };
    const { payload } = opts.key
      ? await jwtVerify(token, opts.key, verifyOpts)
      : await jwtVerify(token, jwks!, verifyOpts);
    if (!payload.sub) throw new Error('token has no subject');
    const realm = payload.realm_access as { roles?: unknown } | undefined;
    return {
      sub: payload.sub,
      name: String(payload.preferred_username ?? payload.sub),
      roles: knownRoles(realm?.roles),
    };
  };
}

export const authenticate =
  (verifier: Verifier): RequestHandler =>
  async (req, res, next) => {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    if (!m) return void res.status(401).json({ error: 'missing bearer token' });
    try {
      req.principal = await verifier(m[1]);
      next();
    } catch {
      res.status(401).json({ error: 'invalid token' });
    }
  };

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, res, next) => {
    if (!req.principal?.roles.some((r) => roles.includes(r))) {
      return void res.status(403).json({ error: 'forbidden' });
    }
    next();
  };
