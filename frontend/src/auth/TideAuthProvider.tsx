import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { TideCloakContextProvider, useAuthCallback, useTideCloak } from '@tidecloak/react'
import { makeApi, type AuthFetch } from '@/lib/api'
import type { Role, User } from '@/types'
import { AUTH_MODE, Ctx, type Auth } from './context'

/** Only admins sign in; the admin is also the approver. */
const ROLE_ORDER: Role[] = ['admin']

function Splash({ children }: { children: ReactNode }) {
  return <div className="flex min-h-svh items-center justify-center p-6 text-muted-foreground">{children}</div>
}

/** Tide usernames are a 64-character hex vuid; show something a person can read. */
const displayName = (username: unknown, sub: string) =>
  typeof username === 'string' && username && !/^[0-9a-f]{32,}$/i.test(username)
    ? username
    : `Tide user ${sub.slice(0, 8)}`

function TideBridge({ children }: { children: ReactNode }) {
  const tc = useTideCloak()
  const cb = useAuthCallback({
    onSuccess: (returnUrl) => window.location.assign(returnUrl || '/'),
    onError: () => window.location.assign('/'),
    onMissingVerifierRedirectTo: '/',
  })

  const { authenticated, token, hasRealmRole, getValueFromToken, login, logout, secureFetch } = tc

  const role = useMemo(
    () => (authenticated ? ROLE_ORDER.find((r) => hasRealmRole(r)) ?? null : null),
    // hasRealmRole reads the current token; re-evaluate when it changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [authenticated, token],
  )

  const user = useMemo<User | null>(() => {
    if (!authenticated || !role) return null
    const sub = String(getValueFromToken('sub') ?? '')
    return { id: sub, name: displayName(getValueFromToken('preferred_username'), sub), role }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, role, token])

  const value = useMemo<Auth>(() => {
    // secureFetch signs a DPoP proof for the exact URL, so hand it an absolute one.
    const authFetch: AuthFetch = (input, init) => secureFetch(new URL(input, window.location.origin).href, init)
    return {
      mode: AUTH_MODE,
      user,
      noRole: authenticated && !role,
      api: makeApi(authFetch),
      login: () => void login(),
      logout: () => void logout(),
    }
  }, [user, authenticated, role, secureFetch, login, logout])

  // The OIDC redirect carries ?code=; it must be exchanged before the router sees the URL.
  if (cb.isCallback) {
    return <Splash>{cb.error ? `Sign-in failed: ${cb.error.message}` : 'Completing sign-in…'}</Splash>
  }
  if (tc.initError) return <Splash>Could not reach TideCloak: {tc.initError.message}</Splash>
  if (tc.isInitializing) return <Splash>Connecting to TideCloak…</Splash>

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function TideAuthProvider({ children }: { children: ReactNode }) {
  const [adapter, setAdapter] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Adapter JSON comes from the realm bootstrap; see README "Real TideCloak login".
    fetch('/tidecloak.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setAdapter)
      .catch(() => setError('Missing /tidecloak.json. Copy data/tidecloak.json to frontend/public/ (see README).'))
  }, [])

  // useDPoP lives inside config; as a JSX prop it is silently ignored.
  const config = useMemo(() => adapter && { ...adapter, useDPoP: { mode: 'strict', alg: 'ES256' } }, [adapter])

  if (error) return <Splash>{error}</Splash>
  if (!config) return <Splash>Loading…</Splash>

  return (
    <TideCloakContextProvider config={config}>
      <TideBridge>{children}</TideBridge>
    </TideCloakContextProvider>
  )
}
