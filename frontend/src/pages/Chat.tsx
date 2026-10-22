import { Clock, Send } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { LabelBadge } from '@/components/badges'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { AGENT_NAME, DEMO_PROMPTS, LANGS, REFUND_LIMIT } from '@/data/mock'
import { formatVnd } from '@/lib/engine'
import { cn } from '@/lib/utils'
import { useStore } from '@/store'
import type { ChatMessage, Lang, Order } from '@/types'

const PLACEHOLDER: Record<Lang, string> = {
  vi: 'Nhập tin nhắn…',
  pt: 'Escreva uma mensagem…',
  fr: 'Écrivez un message…',
  it: 'Scrivi un messaggio…',
  en: 'Type a message…',
}

const STATUS_TEXT: Record<Order['status'], { text: string; cls: string }> = {
  out_for_delivery: { text: 'Out for delivery', cls: 'text-emerald-700 dark:text-emerald-400' },
  delivered: { text: 'Delivered', cls: 'text-muted-foreground' },
  refunded: { text: 'Refunded', cls: 'text-amber-700 dark:text-amber-400' },
}

export default function Chat() {
  const { state, send } = useStore()
  const user = state.user!
  const [lang, setLang] = useState<Lang>('it')
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const orders = state.orders.filter((o) => o.customerId === user.id)
  const mine = state.requests.filter((r) => r.requesterId === user.id)
  const lastCheck = [...state.messages].reverse().find((m) => m.from === 'customer')

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [state.messages.length])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    send(text, lang)
    setDraft('')
  }

  return (
    <div className="flex flex-1 flex-wrap items-stretch gap-6 p-4 sm:px-8 sm:py-6">
      <aside aria-label="Your orders" className="flex max-w-80 flex-1 basis-64 flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Your orders</h2>
        {orders.map((o) => (
          <Card key={o.id} size="sm">
            <CardContent className="flex flex-col gap-1.5">
              <div className="flex justify-between font-mono text-sm">
                <span>#{o.id}</span>
                <span>{formatVnd(o.amount)}</span>
              </div>
              <div className="font-medium">{o.item}</div>
              <div className={cn('text-sm', STATUS_TEXT[o.status].cls)}>
                ● {STATUS_TEXT[o.status].text} · {o.statusDate}
              </div>
            </CardContent>
          </Card>
        ))}
        <p className="text-sm leading-relaxed text-muted-foreground">
          You only see your own orders. Mock data, no real payments.
        </p>
      </aside>

      <main className="flex min-w-0 flex-[999_1_520px] flex-col overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3">
          <h1 className="flex-1 text-lg font-semibold">Support chat</h1>
          <div role="group" aria-label="Language" className="flex gap-1 rounded-xl bg-muted p-1">
            {LANGS.map((l) => (
              <Button
                key={l.code}
                size="sm"
                variant={lang === l.code ? 'default' : 'ghost'}
                aria-pressed={lang === l.code}
                title={l.name}
                className="h-9 min-w-11"
                onClick={() => setLang(l.code)}
              >
                {l.code}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex min-h-80 flex-1 flex-col gap-4 overflow-y-auto bg-muted/30 px-5 py-6" aria-live="polite">
          {state.messages.length === 0 && (
            <div className="m-auto max-w-sm text-center text-sm text-muted-foreground">
              Ask about an order in any supported language, or try one of the demo messages below.
            </div>
          )}
          {state.messages.map((m) => (
            <Bubble key={m.id} m={m} />
          ))}
          <div ref={endRef} />
        </div>

        <div className="flex flex-wrap gap-2 border-t px-5 pt-3">
          {DEMO_PROMPTS.map((p) => (
            <Button
              key={p.label}
              size="sm"
              variant="outline"
              className="h-9"
              onClick={() => {
                setLang(p.lang)
                send(p.text, p.lang)
              }}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <form onSubmit={submit} className="flex gap-3 px-5 py-3">
          <label htmlFor="msg" className="sr-only">
            Message
          </label>
          <Input
            id="msg"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={PLACEHOLDER[lang]}
            className="h-11"
          />
          <Button type="submit" size="lg" className="h-11 px-5">
            <Send aria-hidden /> Send
          </Button>
        </form>
      </main>

      <aside aria-label="Safety panel" className="flex max-w-72 flex-1 basis-64 flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Agent guardrails</h2>
        <Card size="sm">
          <CardContent className="flex flex-col gap-4">
            <Fact label="Agent identity">
              <span className="font-mono text-sm">{AGENT_NAME}</span>
              <span className="text-sm text-muted-foreground">Signed in to TideCloak with a narrow role</span>
            </Fact>
            <Separator />
            <Fact label="Auto-refund limit">
              <span className="text-2xl font-semibold">{formatVnd(REFUND_LIMIT)}</span>
              <span className="text-sm text-muted-foreground">Anything higher needs 2 of 3 humans</span>
            </Fact>
            <Separator />
            <Fact label="Last message check">
              {lastCheck?.label ? (
                <>
                  <LabelBadge label={lastCheck.label} className="self-start" />
                  <span className="text-sm text-muted-foreground">
                    {lastCheck.label === 'BENIGN'
                      ? 'No attack detected'
                      : 'Refund held by role limit, even if the check had missed it'}
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">No messages yet</span>
              )}
            </Fact>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex flex-col gap-2.5">
            <span className="text-xs text-muted-foreground">Your refund requests</span>
            {mine.length === 0 && <span className="text-sm text-muted-foreground">None</span>}
            {mine.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="font-mono">{r.id}</span>
                <span
                  className={cn(
                    r.status === 'pending' && 'text-amber-700 dark:text-amber-400',
                    r.status === 'approved' && 'text-emerald-700 dark:text-emerald-400',
                    r.status === 'denied' && 'text-red-700 dark:text-red-400',
                  )}
                >
                  {r.status === 'pending'
                    ? `Pending · ${r.votes.filter((v) => v.decision === 'approved').length}/2`
                    : r.status === 'approved'
                      ? 'Approved'
                      : 'Denied'}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

function Bubble({ m }: { m: ChatMessage }) {
  const { state } = useStore()
  const req = m.requestId ? state.requests.find((r) => r.id === m.requestId) : undefined
  const mineMsg = m.from === 'customer'
  return (
    <div className={cn('flex max-w-[78%] flex-col gap-1.5', mineMsg ? 'items-end self-end' : 'items-start self-start')}>
      {!mineMsg && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>SafeDesk AI</span>
        </div>
      )}
      <div
        className={cn(
          'px-4 py-3 text-[15px] leading-relaxed',
          mineMsg
            ? 'rounded-2xl rounded-br-sm bg-primary text-primary-foreground'
            : 'rounded-2xl rounded-bl-sm border bg-card',
        )}
      >
        {m.text}
      </div>
      {mineMsg && m.label && (
        <div className="flex items-center gap-2 text-xs">
          <LabelBadge label={m.label} />
          {m.label !== 'BENIGN' && <span className="text-muted-foreground">flagged · {m.score?.toFixed(2)}</span>}
        </div>
      )}
      {m.tool && <div className="font-mono text-xs text-muted-foreground">tool: {m.tool}</div>}
      {req && req.status === 'pending' && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
          <Clock aria-hidden />
          <AlertDescription className="text-amber-950 dark:text-amber-100">
            <strong>Request {req.id} is waiting for review.</strong>{' '}
            {req.votes.filter((v) => v.decision === 'approved').length} of 2 approvals. No money has moved.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
