import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AttackLabel, AuditKind } from '@/types'

const TONE = {
  good: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  bad: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  warn: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  neutral: 'bg-muted text-muted-foreground',
}

const KIND_TONE: Record<AuditKind, keyof typeof TONE> = {
  BENIGN: 'good',
  JAILBREAK: 'bad',
  PROMPT_INJECTION: 'bad',
  REQUEST: 'warn',
  APPLIED: 'good',
  DENIED: 'bad',
  AUTO_REFUND: 'good',
  BLOCKED: 'bad',
  VOTE: 'neutral',
}

export function KindBadge({ kind, className }: { kind: AuditKind; className?: string }) {
  return (
    <Badge variant="secondary" className={cn('rounded-sm font-mono text-xs', TONE[KIND_TONE[kind]], className)}>
      {kind.replace('_', kind === 'AUTO_REFUND' ? '-' : '_')}
    </Badge>
  )
}

export function LabelBadge({ label, className }: { label: AttackLabel; className?: string }) {
  return <KindBadge kind={label} className={className} />
}

export function StatusPill({ tone, children }: { tone: keyof typeof TONE; children: React.ReactNode }) {
  return (
    <Badge variant="secondary" className={cn('rounded-full', TONE[tone])}>
      {children}
    </Badge>
  )
}
