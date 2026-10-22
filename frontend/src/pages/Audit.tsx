import { TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { KindBadge } from '@/components/badges'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePolling } from '@/hooks/usePolling'
import { toRow } from '@/lib/audit'
import { LANGS, POLL_MS } from '@/lib/constants'
import type { AuditKind } from '@/types'

const EVENT_FILTERS: { value: string; label: string; kinds?: AuditKind[] }[] = [
  { value: 'all', label: 'All events' },
  { value: 'flagged', label: 'Flagged messages', kinds: ['JAILBREAK', 'PROMPT_INJECTION'] },
  { value: 'requests', label: 'Requests', kinds: ['REQUEST'] },
  { value: 'decisions', label: 'Decisions', kinds: ['VOTE', 'APPLIED', 'DENIED', 'BLOCKED'] },
]

const LANG_FILTERS = [{ value: 'all', label: 'All' }, ...LANGS.map((l) => ({ value: l.code, label: l.code }))]

export default function Audit() {
  const { api } = useAuth()
  const { data, error, reload } = usePolling(api.audit, POLL_MS)
  const [event, setEvent] = useState('all')
  const [lang, setLang] = useState('all')

  const all = useMemo(() => [...(data ?? [])].reverse().map(toRow), [data])
  const flagged = all.filter((e) => e.kind === 'JAILBREAK' || e.kind === 'PROMPT_INJECTION')
  const checked = all.filter((e) => e.kind === 'MESSAGE').length
  const refunds = all.filter((e) => e.kind === 'APPLIED' && e.detail.includes('refunded')).length
  const byLang = LANGS.map((l) => ({ code: l.code, n: flagged.filter((e) => e.lang === l.code).length }))

  const kinds = EVENT_FILTERS.find((f) => f.value === event)?.kinds
  const rows = all.filter((e) => (!kinds || kinds.includes(e.kind)) && (lang === 'all' || e.lang === lang))

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-muted-foreground">Read-only. Nobody can edit entries or approve alone.</p>
      </div>
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

      <section aria-label="Summary" className="flex flex-wrap gap-4">
        <Stat label="Messages checked" value={checked} />
        <Stat label="Attacks flagged" value={flagged.length} tone="text-red-700 dark:text-red-400" />
        <Stat label="Refunds applied" value={refunds} />
        <Card size="sm" className="min-w-80 flex-[2_1_0]">
          <CardContent className="flex flex-col gap-2">
            <div className="text-xs text-muted-foreground">Flagged by language</div>
            <div className="flex flex-wrap gap-2 font-mono text-sm">
              {byLang.map((l) => (
                <span key={l.code} className="rounded-sm bg-muted px-2 py-0.5">
                  {l.code} {l.n}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section aria-label="Filters" className="flex flex-wrap items-center gap-3">
        <span id="event-label" className="text-sm text-muted-foreground">
          Event
        </span>
        <Select value={event} onValueChange={(v) => setEvent(v ?? 'all')}>
          <SelectTrigger aria-labelledby="event-label" className="h-11 min-w-44">
            <SelectValue>{(v: string) => EVENT_FILTERS.find((f) => f.value === v)?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {EVENT_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span id="lang-label" className="text-sm text-muted-foreground">
          Language
        </span>
        <Select value={lang} onValueChange={(v) => setLang(v ?? 'all')}>
          <SelectTrigger aria-labelledby="lang-label" className="h-11 min-w-28">
            <SelectValue>{(v: string) => LANG_FILTERS.find((f) => f.value === v)?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {LANG_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <Card className="overflow-hidden py-0">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead className="px-4 py-3.5">Time</TableHead>
              <TableHead className="px-4">Event</TableHead>
              <TableHead className="px-4">Actor</TableHead>
              <TableHead className="px-4">Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="px-4 py-3.5 font-mono text-sm whitespace-nowrap">{e.at}</TableCell>
                <TableCell className="px-4">
                  <KindBadge kind={e.kind} />
                </TableCell>
                <TableCell className="px-4 whitespace-normal">{e.actor}</TableCell>
                <TableCell className="px-4 whitespace-normal">{e.detail}</TableCell>
              </TableRow>
            ))}
            {data && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No entries match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </main>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <Card size="sm" className="min-w-40 flex-1">
      <CardContent>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-3xl font-semibold ${tone ?? ''}`}>{value}</div>
      </CardContent>
    </Card>
  )
}
