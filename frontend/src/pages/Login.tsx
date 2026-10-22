import { Lock, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { homeFor } from '@/components/AppShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { USERS } from '@/data/mock'
import { useStore } from '@/store'
import type { User } from '@/types'

const SHORTCUTS = [USERS[0], USERS[1], USERS[4]]

export default function Login() {
  const { login, reset } = useStore()
  const navigate = useNavigate()

  const signIn = (u: User) => {
    login(u)
    navigate(homeFor(u.role))
  }

  return (
    <div className="flex min-h-svh flex-wrap">
      <section className="flex flex-1 basis-[480px] flex-col justify-between gap-12 bg-[oklch(0.27_0.04_185)] p-8 text-[oklch(0.93_0.02_185)] sm:p-16">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="size-8 text-[oklch(0.82_0.1_185)]" aria-hidden />
          <span className="text-2xl font-semibold">SafeDesk</span>
        </div>
        <div className="flex max-w-lg flex-col gap-5">
          <h1 className="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
            A support agent that can't move money on its own.
          </h1>
          <p className="text-lg leading-relaxed text-[oklch(0.8_0.03_185)]">
            Replies in Vietnamese, Portuguese, French, Italian and English. Anything risky waits for 2 of 3 human
            approvers.
          </p>
        </div>
        <div className="flex flex-col gap-2 font-mono text-sm text-[oklch(0.8_0.03_185)]">
          <span>customer · approver · admin · support-agent</span>
          <span>No role can both propose and approve.</span>
        </div>
      </section>

      <section className="flex flex-1 basis-[420px] items-center justify-center p-6 sm:p-12">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <CardDescription>Your role comes from your TideCloak token.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <Button size="lg" className="h-12 text-base" onClick={() => signIn(USERS[0])}>
              <Lock aria-hidden /> Continue with TideCloak
            </Button>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Separator className="flex-1" /> Demo shortcuts <Separator className="flex-1" />
            </div>
            <div className="flex flex-col gap-2.5">
              {SHORTCUTS.map((u) => (
                <Button key={u.id} variant="outline" className="h-11 justify-between" onClick={() => signIn(u)}>
                  <span>{u.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{u.role}</span>
                </Button>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Mock login for the demo. Real sign-in runs through TideCloak.
            </p>
            <Button variant="link" size="sm" className="self-start px-0" onClick={reset}>
              Reset demo data
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
