export type Role = 'customer' | 'approver' | 'admin'
export type Lang = 'vi' | 'pt' | 'fr' | 'it' | 'en'
export type AttackLabel = 'BENIGN' | 'JAILBREAK' | 'PROMPT_INJECTION'

export interface User {
  /** TideCloak subject (token `sub`). */
  id: string
  name: string
  role: Role
}

/** Shapes below mirror the Express API (server/src/types.ts). */
export interface Order {
  id: string
  customerSub: string
  amountVnd: number
  status: 'paid' | 'refunded'
  item: string
}

export interface Vote {
  approverSub: string
  vote: 'approve' | 'deny'
}

export interface RefundRequest {
  id: string
  orderId: string
  item?: string
  amountVnd: number
  reason: string
  /** Absent on the customer's own-requests list. */
  originalMessage?: string
  flag: AttackLabel
  requestedBy: string
  status: 'pending' | 'approved' | 'denied'
  votes: Vote[]
}

export interface ChatAction {
  tool: 'get_order' | 'issue_refund'
  outcome: 'ok' | 'executed' | 'pending' | 'denied'
  requestId?: string
}

export interface ChatResult {
  reply: string
  label: AttackLabel
  actions: ChatAction[]
}

export interface AuditEvent {
  id: number
  ts: string
  type: string
  actorSub: string
  data: Record<string, unknown>
}

export type AuditKind =
  | 'MESSAGE'
  | 'JAILBREAK'
  | 'PROMPT_INJECTION'
  | 'REQUEST'
  | 'APPLIED'
  | 'DENIED'
  | 'BLOCKED'
  | 'VOTE'
  | 'ERROR'

export interface ChatMessage {
  id: number
  from: 'customer' | 'agent'
  text: string
  label?: AttackLabel
  requestId?: string
}
