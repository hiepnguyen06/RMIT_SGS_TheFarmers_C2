import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react'
import { initialState } from '@/data/mock'
import { castVote, processMessage } from '@/lib/engine'
import type { AppState, Decision, Lang, User } from '@/types'

type Action =
  | { type: 'login'; user: User }
  | { type: 'logout' }
  | { type: 'send'; text: string; lang: Lang; at: string }
  | { type: 'vote'; requestId: string; decision: Decision; at: string }
  | { type: 'reset' }

function reducer(state: AppState, a: Action): AppState {
  switch (a.type) {
    case 'login':
      return { ...state, user: a.user }
    case 'logout':
      return { ...state, user: null }
    case 'send':
      return processMessage(state, a.text, a.lang, a.at)
    case 'vote':
      return castVote(state, a.requestId, a.decision, a.at)
    case 'reset':
      return initialState()
  }
}

const nowHm = () =>
  new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

interface Store {
  state: AppState
  login: (u: User) => void
  logout: () => void
  send: (text: string, lang: Lang) => void
  vote: (requestId: string, decision: Decision) => void
  reset: () => void
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const value = useMemo<Store>(
    () => ({
      state,
      login: (user) => dispatch({ type: 'login', user }),
      logout: () => dispatch({ type: 'logout' }),
      send: (text, lang) => dispatch({ type: 'send', text, lang, at: nowHm() }),
      vote: (requestId, decision) => dispatch({ type: 'vote', requestId, decision, at: nowHm() }),
      reset: () => dispatch({ type: 'reset' }),
    }),
    [state],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): Store {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore outside StoreProvider')
  return v
}
