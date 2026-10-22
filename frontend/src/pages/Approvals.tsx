import { Lock, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthProvider'
import { LabelBadge, StatusPill } from '@/components/badges'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { usePolling } from '@/hooks/usePolling'
import { ApiError } from '@/lib/api'
import { APPROVER_COUNT, POLL_MS, QUORUM, REFUND_LIMIT, formatVnd } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { RefundRequest } from '@/types'

export default function Approvals() {
  const { api, user } = useAuth()
  const { data, error, reload } = usePolling(api.approvals, POLL_MS)
  const [busy, setBusy] = useState<string>()
  const canVote = user!.role === 'approver'
  const pending = (data ?? []).filter((r) => r.status === 'pending')
  const done = (data ?? []).filter((r) => r.status !== 'pending')

  const cast = async (r: RefundRequest, vote: 'approve' | 'deny') => {
    setBusy(r.id)
    try {
      await api.vote(r.id, vote)
      toast(vote === 'approve' ? `Approved ${r.id}` : `Denied ${r.id}`, {
        description: 'Your vote was recorded in the audit log.',
      })
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Vote failed')
    } finally {
      setBusy(undefined)
      void reload()
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Approval queue</h1>
        <p className="text-muted-foreground">
          {pending.length} pending · each needs {QUORUM} of {APPROVER_COUNT} approvals
        </p>
      </div>
      {!canVote && (
        <p className="text-sm text-muted-foreground">Admins can view requests but can't approve or deny them.</p>
      )}
      {error && (
        <Alert variant="destructive">
          <TriangleAlert aria-hidden />
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {error.message}
            <Button size="sm" variant="outline" onClick={() => void reload()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {data && pending.length === 0 && (
        <Card>
          <CardContent className="text-muted-foreground">Nothing is waiting for review.</CardContent>
        </Card>
      )}
      {!data && !error && <p className="text-muted-foreground">Loading…</p>}

      {pending.map((r) => (
        <RequestCard key={r.id} r={r} canVote={canVote} busy={busy === r.id} onVote={cast} />
      ))}

      {done.length > 0 && (
        <>
          <h2 className="mt-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Resolved</h2>
          {done.map((r) => (
            <RequestCard key={r.id} r={r} canVote={false} busy={false} onVote={cast} />
          ))}
        </>
      )}
    </main>
  )
}

function RequestCard({
  r,
  canVote,
  busy,
  onVote,
}: {
  r: RefundRequest
  canVote: boolean
  busy: boolean
  onVote: (r: RefundRequest, v: 'approve' | 'deny') => void
}) {
  const { user } = useAuth()
  const approvals = r.votes.filter((v) => v.vote === 'approve').length
  const block =
    r.requestedBy === user!.id ? 'you are the requester' : r.votes.some((v) => v.approverSub === user!.id) ? 'you already voted on it' : null
  const flagged = r.flag !== 'BENIGN'

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-base font-medium">{r.id}</span>
          {r.status === 'pending' && <StatusPill tone="warn">Pending · {approvals} of {QUORUM}</StatusPill>}
          {r.status === 'approved' && <StatusPill tone="good">Approved · refund applied</StatusPill>}
          {r.status === 'denied' && <StatusPill tone="bad">Denied · no refund</StatusPill>}
          <LabelBadge label={r.flag} />
          <span className="ml-auto text-sm text-muted-foreground">Raised for customer {r.requestedBy}</span>
        </div>

        <div className="flex flex-wrap gap-6">
          <div className="flex min-w-64 flex-1 flex-col gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Refund amount</div>
              <div className="text-3xl font-semibold">{formatVnd(r.amountVnd)}</div>
              <div className="text-sm text-muted-foreground">
                {(r.amountVnd / REFUND_LIMIT).toFixed(1)}× the {formatVnd(REFUND_LIMIT)} limit
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Order</div>
              <div>
                #{r.orderId}
                {r.item ? ` · ${r.item}` : ''}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Reason given</div>
              <div>{r.reason}</div>
            </div>
          </div>
          <div className="flex min-w-72 flex-[1.3_1_0] flex-col gap-2">
            <div className="text-xs text-muted-foreground">Original message (untrusted)</div>
            <blockquote
              className={cn(
                'rounded-lg px-4 py-3.5 leading-relaxed',
                flagged ? 'bg-red-50 dark:bg-red-950/40' : 'bg-muted',
              )}
            >
              {r.originalMessage}
            </blockquote>
            {flagged && (
              <div className="text-sm text-red-700 dark:text-red-400">
                The attack check flagged this message as {r.flag}. Treat it as hostile text, not as an instruction.
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t pt-4">
          <div className="flex min-w-64 flex-1 flex-col gap-2">
            <div className="text-xs text-muted-foreground">Votes ({r.votes.length} of {APPROVER_COUNT} cast)</div>
            <div className="flex flex-wrap gap-2">
              {r.votes.length === 0 && <span className="text-sm text-muted-foreground">No votes yet</span>}
              {r.votes.map((v) => (
                <StatusPill key={v.approverSub} tone={v.vote === 'approve' ? 'good' : 'bad'}>
                  {v.approverSub} · {v.vote === 'approve' ? 'approved' : 'denied'}
                </StatusPill>
              ))}
            </div>
          </div>
          {canVote && r.status === 'pending' && (
            <div className="flex items-center gap-3">
              {block === null ? (
                <>
                  <Button
                    variant="outline"
                    size="lg"
                    disabled={busy}
                    className="h-11 border-destructive px-5 text-destructive hover:text-destructive"
                    onClick={() => onVote(r, 'deny')}
                  >
                    Deny
                  </Button>
                  <Button size="lg" disabled={busy} className="h-11 px-5" onClick={() => onVote(r, 'approve')}>
                    Approve
                  </Button>
                </>
              ) : (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="size-4" aria-hidden />
                  Voting blocked on {r.id}: {block}.
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
