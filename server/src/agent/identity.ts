import type { Config } from '../config.js';
import type { Verifier } from '../auth/jwt.js';
import { ROLES, type Principal } from '../types.js';

type FetchFn = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<any>;
}>;

const MOCK_AGENT: Principal = { sub: 'agent', name: 'agent', roles: ['support-agent'] };
const UNSAFE_AGENT: Principal = { sub: 'agent-admin', name: 'agent (admin token)', roles: [...ROLES] };

/**
 * The agent signs in to TideCloak as its own service identity (client_credentials).
 * Its roles come from the verified token, so the policy gate sees what TideCloak granted.
 */
export function makeAgentIdentity(
  config: Config,
  verifier: Verifier,
  fetchImpl: FetchFn = fetch as unknown as FetchFn,
  now: () => number = Date.now,
) {
  let cached: { principal: Principal; expiresAt: number } | undefined;

  return async (unsafe = false): Promise<Principal> => {
    if (unsafe && config.UNSAFE_DEMO === 'true' && config.NODE_ENV !== 'production') return UNSAFE_AGENT;
    if (config.AUTH_MODE === 'mock' || config.AGENT_IDENTITY === 'simulated') return MOCK_AGENT;
    if (cached && cached.expiresAt > now()) return cached.principal;

    const url = `${config.TIDECLOAK_URL!.replace(/\/$/, '')}/realms/${config.TIDECLOAK_REALM}/protocol/openid-connect/token`;
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.AGENT_CLIENT_ID ?? '',
        client_secret: config.AGENT_CLIENT_SECRET ?? '',
      }).toString(),
    });
    if (!res.ok) throw new Error(`agent token request failed (${res.status})`);
    const body = await res.json();
    const principal = await verifier(String(body.access_token));
    cached = { principal, expiresAt: now() + Math.max(0, Number(body.expires_in ?? 60) - 30) * 1000 };
    return principal;
  };
}
