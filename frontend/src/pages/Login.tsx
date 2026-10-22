import { Lock, ShieldCheck } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { PERSONAS, useAuth } from '@/auth/AuthProvider'
import { ADMIN_HOME } from '@/components/AppShell'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { APPROVAL_TEXT } from '@/lib/constants'
import type { User } from '@/types'

export default function Login() {
  const { mode, user, noRole, login, logout } = useAuth()
  const navigate = useNavigate()
  if (user) return <Navigate to={ADMIN_HOME} replace />

  const signIn = (u?: User) => {
    login(u)
    if (u) navigate(ADMIN_HOME)
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
            Customers chat in Vietnamese, Portuguese, French, Italian or English. Anything risky waits for {APPROVAL_TEXT}.
          </p>
        </div>
        <div className="flex flex-col gap-2 font-mono text-sm text-[oklch(0.8_0.03_185)]">
          <span>customer (public) · admin · support-agent</span>
          <span>The agent proposes. Only a signed-in admin approves.</span>
        </div>
      </section>

      <section className="flex flex-1 basis-[420px] items-center justify-center p-6 sm:p-12">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Staff sign-in</CardTitle>
            <CardDescription>
              {mode === 'tidecloak' ? 'Admins only. Your role comes from your TideCloak token.' : 'Development login for the admin.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {mode === 'tidecloak' ? (
              noRole ? (
                <>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    You are signed in, but your account is not an admin. Customers do not need to sign in: use the shop
                    chat instead.
                  </p>
                  <Button size="lg" variant="outline" className="h-12 text-base" onClick={logout}>
                    Sign out
                  </Button>
                </>
              ) : (
                <Button size="lg" className="h-12 text-base" onClick={() => signIn()}>
                  <Lock aria-hidden /> Continue with TideCloak
                </Button>
              )
            ) : (
              <>
                {PERSONAS.map((u) => (
                  <Button key={u.id} variant="outline" className="h-11 justify-between" onClick={() => signIn(u)}>
                    <span>{u.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{u.role}</span>
                  </Button>
                ))}
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Mock login (VITE_AUTH_MODE=mock). The API accepts this identity only when it runs with
                  AUTH_MODE=mock. Real sign-in runs through TideCloak.
                </p>
              </>
            )}
            <Link to="/" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
              Back to the shop chat
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
