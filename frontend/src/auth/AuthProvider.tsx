import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { makeApi, type Api, type AuthFetch } from '@/lib/api'
import type { User } from '@/types'

export const AUTH_MODE: 'mock' | 'tidecloak' = import.meta.env.VITE_AUTH_MODE === 'tidecloak' ? 'tidecloak' : 'mock'

/** Dev personas for mock mode; the API must run with AUTH_MODE=mock and seed these customers. */
export const PERSONAS: User[] = [
  { id: 'cust-an', name: 'An Nguyen', role: 'customer' },
  { id: 'ap1', name: 'Approver 1', role: 'approver' },
  { id: 'ap2', name: 'Approver 2', role: 'approver' },
  { id: 'ap3', name: 'Approver 3', role: 'approver' },
  { id: 'adm', name: 'Shop operator', role: 'admin' },
]

interface Auth {
  mode: typeof AUTH_MODE
  user: User | null
  api: Api
  login: (persona?: User) => void
  logout: () => void
}

const Ctx = createContext<Auth | null>(null)
const KEY = 'safedesk.persona'

function readPersona(): User | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readPersona)

  const login = useCallback((persona?: User) => {
    if (!persona) return
    try {
      sessionStorage.setItem(KEY, JSON.stringify(persona))
    } catch {
      /* private mode: state still works for this tab */
    }
    setUser(persona)
  }, [])

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
    setUser(null)
  }, [])

  const value = useMemo<Auth>(() => {
    const authFetch: AuthFetch = (input, init) =>
      fetch(input, {
        ...init,
        headers: { ...(init?.headers ?? {}), authorization: `Bearer mock:${user?.id ?? 'anon'}:${user?.role ?? ''}` },
      })
    return { mode: AUTH_MODE, user, api: makeApi(authFetch), login, logout }
  }, [user, login, logout])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): Auth {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}
