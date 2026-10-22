import { createContext, useContext } from 'react'
import type { Api } from '@/lib/api'
import type { User } from '@/types'

export const AUTH_MODE: 'mock' | 'tidecloak' = import.meta.env.VITE_AUTH_MODE === 'tidecloak' ? 'tidecloak' : 'mock'

export interface Auth {
  mode: typeof AUTH_MODE
  user: User | null
  /** Signed in at TideCloak, but the token does not carry the admin role. */
  noRole: boolean
  api: Api
  login: (persona?: User) => void
  logout: () => void
}

export const Ctx = createContext<Auth | null>(null)

export function useAuth(): Auth {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}
