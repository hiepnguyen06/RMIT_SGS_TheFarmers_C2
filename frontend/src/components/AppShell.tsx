import { ShieldCheck } from 'lucide-react'
import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Role } from '@/types'

const NAV: { to: string; label: string; roles: Role[] }[] = [
  { to: '/chat', label: 'Chat', roles: ['customer'] },
  { to: '/approvals', label: 'Approvals', roles: ['approver', 'admin'] },
  { to: '/audit', label: 'Audit log', roles: ['approver', 'admin'] },
]

export const homeFor = (role: Role) => (role === 'customer' ? '/chat' : role === 'approver' ? '/approvals' : '/audit')

export function AppShell({ roles }: { roles: Role[] }) {
  const { user, logout } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b bg-card px-4 py-3 sm:px-8">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="size-7 text-primary" aria-hidden />
          <span className="text-xl font-semibold tracking-tight">SafeDesk</span>
        </div>
        <nav aria-label="Main" className="flex gap-1">
          {NAV.filter((n) => n.roles.includes(user.role)).map((n) => (
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
              {user.role === 'admin' && n.to === '/approvals' ? ' (view only)' : ''}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <Badge variant="secondary" className="bg-primary/10 font-mono text-primary">
            role: {user.role}
          </Badge>
          <span className="text-muted-foreground">{user.name}</span>
          <Button variant="ghost" size="sm" onClick={logout}>
            Sign out
          </Button>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
