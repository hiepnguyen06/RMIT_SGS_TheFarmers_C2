import { formatVnd } from '@/lib/constants'
import type { AuditEvent, AuditKind, Lang } from '@/types'

export interface AuditRow {
  id: number
  at: string
  kind: AuditKind
  actor: string
  detail: string
  lang?: Lang
}

const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '')

/** Turns an API audit event into what the table shows. */
export function toRow(e: AuditEvent): AuditRow {
  const d = e.data
  const at = new Date(e.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const base = { id: e.id, at, actor: e.actorSub }
  const lang = d.lang as Lang | undefined
  switch (e.type) {
    case 'message':
      return { ...base, kind: 'MESSAGE', detail: str(d.text), lang }
    case 'flag':
      return { ...base, kind: d.label === 'JAILBREAK' ? 'JAILBREAK' : 'PROMPT_INJECTION', detail: str(d.text), lang }
    case 'refund_pending':
      return { ...base, kind: 'REQUEST', detail: `${str(d.id)} raised for order ${str(d.orderId)}, ${formatVnd(Number(d.amountVnd))}. Sent to approvers.` }
    case 'refund_executed':
      return { ...base, kind: 'APPLIED', detail: `Order ${str(d.orderId)} refunded ${formatVnd(Number(d.amountVnd))}.` }
    case 'vote':
      return { ...base, kind: 'VOTE', detail: `${str(d.requestId)}: ${str(d.vote)}` }
    case 'request_resolved':
      return {
        ...base,
        kind: d.status === 'approved' ? 'APPLIED' : 'DENIED',
        detail: `${str(d.requestId)} ${str(d.status)}${d.reason ? ` (${str(d.reason)})` : ''}`,
      }
    case 'tool_denied':
      return { ...base, kind: 'BLOCKED', detail: str(d.reason) }
    case 'unsafe_demo':
      return { ...base, kind: 'BLOCKED', detail: 'Contrast demo: agent ran with an admin-level identity.' }
    case 'agent_error':
      return { ...base, kind: 'ERROR', detail: str(d.error) }
    default:
      return { ...base, kind: 'MESSAGE', detail: e.type }
  }
}
