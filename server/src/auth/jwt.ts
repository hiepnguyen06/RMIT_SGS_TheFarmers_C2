import { readFileSync } from 'node:fs';
import type { RequestHandler } from 'express';
import { createLocalJWKSet, jwtVerify, type CryptoKey, type JSONWebKeySet, type KeyObject } from 'jose';
import type { Config } from '../config.js';
import { ROLES, type Principal, type Role } from '../types.js';
import { verifyDpop, type JtiStore } from './dpop.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      principal?: Principal;
    }
  }
}

/** The parts of an HTTP request a DPoP proof is bound to. */
export interface ProofRequest {
  url: string;
  method: string;
  headers: { get(name: string): string | null };
}

/**
 * Verify an access token. Pass `req` for a request from a client: the token must then be
 * sender-constrained and carry a valid DPoP proof. Without `req` only the token is checked,
 * which is for server-internal use (the agent verifying its own service-account token).
 */
export type Verifier = (token: string, req?: ProofRequest) => Promise<Principal>;

const knownRoles = (roles: unknown): Role[] =>
  Array.isArray(roles) ? ROLES.filter((r) => roles.includes(r)) : [];

export interface VerifierOptions {
  /** Verification key; defaults to the `jwk` embedded in the adapter JSON. For tests. */
  key?: CryptoKey | KeyObject;
  jtiStore?: JtiStore;
}

function embeddedKeys(file: string): ReturnType<typeof createLocalJWKSet> {
  let adapter: { jwk?: JSONWebKeySet };
  try {
    adapter = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`Cannot read TideCloak adapter JSON at ${file}: ${(e as Error).message}`);
  }
  if (!adapter.jwk?.keys?.length) {
    throw new Error(`Adapter JSON ${file} has no jwk. Export it from the Tide realm, not a plain Keycloak realm.`);
  }
  return createLocalJWKSet(adapter.jwk);
}

export function makeVerifier(config: Config, opts: VerifierOptions = {}): Verifier {
  if (config.AUTH_MODE === 'mock') {
    return async (token) => {
      const m = /^mock:([^:]+):([^:]*)$/.exec(token);
      if (!m) throw new Error('bad mock token');
      return { sub: m[1], name: m[1], roles: knownRoles(m[2].split(',')) };
    };
  }
  const issuer = `${config.TIDECLOAK_URL!.replace(/\/$/, '')}/realms/${config.TIDECLOAK_REALM}`;
  const keys = opts.key ?? embeddedKeys(config.TIDECLOAK_ADAPTER_FILE);
  const trustForwardedHeaders = config.TRUST_FORWARDED_HEADERS === 'true';
  return async (token, req) => {
    const verifyOpts = {
      issuer,
      // Tide realms sign with EdDSA; pinning it stops an RS256/HS256 downgrade.
      algorithms: ['EdDSA'],
      ...(config.TIDECLOAK_AUDIENCE ? { audience: config.TIDECLOAK_AUDIENCE } : {}),
    };
    const { payload } =
      typeof keys === 'function' ? await jwtVerify(token, keys, verifyOpts) : await jwtVerify(token, keys, verifyOpts);
    if (!payload.sub) throw new Error('token has no subject');
    if (payload.azp !== config.TIDECLOAK_CLIENT_ID) throw new Error('token was issued to another client');
    if (req) await verifyDpop(req, token, payload as { cnf?: { jkt?: string } }, { jtiStore: opts.jtiStore, trustForwardedHeaders });
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
    // A DPoP-bound token travels as `DPoP <token>`; a `Bearer` one is only valid in mock mode.
    const m = /^(?:Bearer|DPoP) (.+)$/i.exec(req.headers.authorization ?? '');
    if (!m) return void res.status(401).json({ error: 'missing bearer token' });
    try {
      req.principal = await verifier(m[1], {
        url: `${req.protocol}://${req.get('host') ?? ''}${req.originalUrl}`,
        method: req.method,
        headers: { get: (name) => req.get(name) ?? null },
      });
      next();
    } catch (e) {
      // The client only ever sees a generic 401; the reason stays in the server log.
      console.warn(`auth rejected (${req.method} ${req.originalUrl}): ${e instanceof Error ? e.message : String(e)}`);
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
