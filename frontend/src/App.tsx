import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/auth/AuthProvider'
import { AppShell, homeFor } from '@/components/AppShell'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Approvals from '@/pages/Approvals'
import Audit from '@/pages/Audit'
import Chat from '@/pages/Chat'
import Login from '@/pages/Login'

function Home() {
  const { user } = useAuth()
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route element={<AppShell roles={['customer']} />}>
              <Route path="/chat" element={<Chat />} />
            </Route>
            <Route element={<AppShell roles={['approver', 'admin']} />}>
              <Route path="/approvals" element={<Approvals />} />
              <Route path="/audit" element={<Audit />} />
            </Route>
            <Route path="*" element={<Home />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </AuthProvider>
  )
}
