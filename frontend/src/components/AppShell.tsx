import { ShieldCheck } from 'lucide-react'
import { Link, NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/approvals', label: 'Approvals' },
  { to: '/audit', label: 'Audit log' },
]

export const ADMIN_HOME = '/approvals'

/** The public shop: no sign-in. Staff reach the admin side through the link on the right. */
export function CustomerShell() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center gap-2.5 border-b bg-card px-4 py-3 sm:px-8">
        <ShieldCheck className="size-7 text-primary" aria-hidden />
        <span className="text-xl font-semibold tracking-tight">SafeDesk</span>
        <span className="text-sm text-muted-foreground">Shop assistant</span>
        <Link to="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'ml-auto')}>
          Staff sign-in
        </Link>
      </header>
      <Outlet />
    </div>
  )
}

/** Admin-only area: approvals and the audit log. */
export function AppShell() {
  const { user, logout } = useAuth()
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b bg-card px-4 py-3 sm:px-8">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="size-7 text-primary" aria-hidden />
          <span className="text-xl font-semibold tracking-tight">SafeDesk</span>
        </div>
        <nav aria-label="Main" className="flex gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                  isActive && 'bg-primary/10 text-primary hover:text-primary',
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <Badge variant="secondary" className="bg-primary/10 font-mono text-primary">
            role: {user.role}
          </Badge>
          <span className="text-muted-foreground">{user.name}</span>
          <Link to="/" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            Shop view
          </Link>
          <Button variant="ghost" size="sm" onClick={logout}>
            Sign out
          </Button>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
