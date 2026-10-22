import type { AuditEvent, ChatResult, Lang, Order, RefundRequest } from '@/types'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export type AuthFetch = (input: string, init?: RequestInit) => Promise<Response>

export function makeApi(authFetch: AuthFetch) {
  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response
    try {
      res = await authFetch(path, {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
      })
    } catch {
      throw new ApiError(0, 'Cannot reach the SafeDesk API. Is the server running?')
    }
    const body: unknown = await res.json().catch(() => undefined)
    if (!res.ok) {
      throw new ApiError(res.status, (body as { error?: string } | undefined)?.error ?? `Request failed (${res.status})`)
    }
    if (body === undefined) throw new ApiError(res.status, 'Unexpected response from the server')
    return body as T
  }

  return {
    chat: (message: string, lang: Lang) =>
      call<ChatResult>('/api/chat', { method: 'POST', body: JSON.stringify({ message, lang }) }),
    orders: () => call<Order[]>('/api/orders/mine'),
    myRequests: () => call<RefundRequest[]>('/api/requests/mine'),
    approvals: () => call<RefundRequest[]>('/api/approvals'),
    vote: (id: string, vote: 'approve' | 'deny') =>
      call<RefundRequest>(`/api/approvals/${id}/vote`, { method: 'POST', body: JSON.stringify({ vote }) }),
    audit: () => call<AuditEvent[]>('/api/admin/audit'),
  }
}

export type Api = ReturnType<typeof makeApi>
