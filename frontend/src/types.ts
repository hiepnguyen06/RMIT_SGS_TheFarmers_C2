export type Role = 'customer' | 'approver' | 'admin'
export type Lang = 'vi' | 'pt' | 'fr' | 'it' | 'en'
export type AttackLabel = 'BENIGN' | 'JAILBREAK' | 'PROMPT_INJECTION'

export interface User {
  id: string
  name: string
  role: Role
}

export interface Order {
  id: string
  customerId: string
  item: string
  amount: number
  status: 'out_for_delivery' | 'delivered' | 'refunded'
  statusDate: string
}

export interface ChatMessage {
  id: string
  from: 'customer' | 'agent'
  text: string
  lang: Lang
  label?: AttackLabel
  score?: number
  tool?: string
  requestId?: string
  at: string
}

export type Decision = 'approved' | 'denied'

export interface Vote {
  approverId: string
  name: string
  decision: Decision
}

export interface RefundRequest {
  id: string
  orderId: string
  item: string
  customerName: string
  /** User id of whoever raised it; that person may not vote. */
  requesterId: string
  raisedBy: string
  amount: number
  reason: string
  message: string
  lang: Lang
  label: AttackLabel
  score: number
  raisedAt: string
  votes: Vote[]
  status: 'pending' | 'approved' | 'denied'
}

export type AuditKind =
  | 'BENIGN'
  | 'JAILBREAK'
  | 'PROMPT_INJECTION'
  | 'REQUEST'
  | 'APPLIED'
  | 'DENIED'
  | 'AUTO_REFUND'
  | 'BLOCKED'
  | 'VOTE'

export interface AuditEntry {
  id: string
  at: string
  kind: AuditKind
  actor: string
  detail: string
  lang?: Lang
}

export interface AppState {
  user: User | null
  orders: Order[]
  messages: ChatMessage[]
  requests: RefundRequest[]
  audit: AuditEntry[]
  counters: { msg: number; req: number; audit: number }
}
