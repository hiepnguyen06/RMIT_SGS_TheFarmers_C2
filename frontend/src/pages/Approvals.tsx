import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { LabelBadge, StatusPill } from '@/components/badges'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { APPROVERS, LANGS, QUORUM, REFUND_LIMIT } from '@/data/mock'
import { formatVnd, voteBlock } from '@/lib/engine'
import { cn } from '@/lib/utils'
import { useStore } from '@/store'
import type { Decision, RefundRequest } from '@/types'

const BLOCK_TEXT = {
  requester: 'you are the requester',
  'already-voted': 'you already voted on it',
} as const

export default function Approvals() {
  const { state, vote } = useStore()
  const user = state.user!
  const pending = state.requests.filter((r) => r.status === 'pending')
  const done = state.requests.filter((r) => r.status !== 'pending')
  const canVote = user.role === 'approver'

  const cast = (r: RefundRequest, d: Decision) => {
    vote(r.id, d)
    toast(d === 'approved' ? `Approved ${r.id}` : `Denied ${r.id}`, {
      description: 'Your vote was recorded in the audit log.',
    })
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Approval queue</h1>
        <p className="text-muted-foreground">
          {pending.length} pending · each needs {QUORUM} of {APPROVERS.length} approvals
        </p>
      </div>
      {!canVote && (
        <p className="text-sm text-muted-foreground">
          Admins can view requests but can't approve or deny them.
        </p>
      )}

      {pending.length === 0 && (
        <Card>
          <CardContent className="text-muted-foreground">Nothing is waiting for review.</CardContent>
        </Card>
      )}

      {pending.map((r) => (
        <RequestCard key={r.id} r={r} canVote={canVote} onVote={cast} />
      ))}

      {done.length > 0 && (
        <>
          <h2 className="mt-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Resolved</h2>
          {done.map((r) => (
            <RequestCard key={r.id} r={r} canVote={false} onVote={cast} />
          ))}
        </>
      )}
    </main>
  )
}

function RequestCard({
  r,
  canVote,
  onVote,
}: {
  r: RefundRequest
  canVote: boolean
  onVote: (r: RefundRequest, d: Decision) => void
}) {
  const { state } = useStore()
  const user = state.user!
  const approvals = r.votes.filter((v) => v.decision === 'approved').length
  const block = canVote ? voteBlock(r, user.id, user.role) : null
  const flagged = r.label !== 'BENIGN'
  const langName = LANGS.find((l) => l.code === r.lang)?.name ?? r.lang

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-base font-medium">{r.id}</span>
          {r.status === 'pending' && <StatusPill tone="warn">Pending · {approvals} of {QUORUM}</StatusPill>}
          {r.status === 'approved' && <StatusPill tone="good">Approved · refund applied</StatusPill>}
          {r.status === 'denied' && <StatusPill tone="bad">Denied · no refund</StatusPill>}
          <LabelBadge label={r.label} />
          <span className="ml-auto text-sm text-muted-foreground">
            Raised by {r.raisedBy} · {r.raisedAt}
          </span>
        </div>

        <div className="flex flex-wrap gap-6">
          <div className="flex min-w-64 flex-1 flex-col gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Refund amount</div>
              <div className="text-3xl font-semibold">{formatVnd(r.amount)}</div>
              <div className="text-sm text-muted-foreground">
                {(r.amount / REFUND_LIMIT).toFixed(1)}× the {formatVnd(REFUND_LIMIT)} limit
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Order</div>
              <div>
                #{r.orderId} · {r.item} · {r.customerName}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Reason given</div>
              <div>{r.reason}</div>
            </div>
          </div>
          <div className="flex min-w-72 flex-[1.3_1_0] flex-col gap-2">
            <div className="text-xs text-muted-foreground">
              Original message ({langName}, untrusted)
            </div>
            <blockquote
              className={cn(
                'rounded-lg px-4 py-3.5 leading-relaxed',
                flagged ? 'bg-red-50 dark:bg-red-950/40' : 'bg-muted',
              )}
            >
              {r.message}
            </blockquote>
            {flagged && (
              <div className="text-sm text-red-700 dark:text-red-400">
                Attack check flagged this message at {r.score.toFixed(2)}. Treat it as hostile text, not as an
                instruction.
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t pt-4">
          <div className="flex min-w-64 flex-1 flex-col gap-2">
            <div className="text-xs text-muted-foreground">Votes</div>
            <div className="flex flex-wrap gap-2">
              {APPROVERS.map((a) => {
                const v = r.votes.find((x) => x.approverId === a.id)
                return v ? (
                  <StatusPill key={a.id} tone={v.decision === 'approved' ? 'good' : 'bad'}>
                    {a.name} · {v.decision}
                  </StatusPill>
                ) : (
                  <span
                    key={a.id}
                    className="rounded-full border border-dashed border-muted-foreground/60 px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    {a.name} · not voted
                  </span>
                )
              })}
            </div>
          </div>
          {canVote && r.status === 'pending' && (
            <div className="flex items-center gap-3">
              {block === null ? (
                <>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-11 border-destructive px-5 text-destructive hover:text-destructive"
                    onClick={() => onVote(r, 'denied')}
                  >
                    Deny
                  </Button>
                  <Button size="lg" className="h-11 px-5" onClick={() => onVote(r, 'approved')}>
                    Approve
                  </Button>
                </>
              ) : (
                block in BLOCK_TEXT && (
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="size-4" aria-hidden />
                    Voting blocked on {r.id}: {BLOCK_TEXT[block as keyof typeof BLOCK_TEXT]}.
                  </span>
                )
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
