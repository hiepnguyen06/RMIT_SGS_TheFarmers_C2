import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthProvider'
import { AppShell, CustomerShell } from '@/components/AppShell'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Approvals from '@/pages/Approvals'
import Audit from '@/pages/Audit'
import Chat from '@/pages/Chat'
import Login from '@/pages/Login'

export default function App() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            {/* Public: customers do not sign in. */}
            <Route element={<CustomerShell />}>
              <Route path="/" element={<Chat />} />
            </Route>
            {/* Admin only: the admin is also the approver. */}
            <Route path="/login" element={<Login />} />
            <Route element={<AppShell />}>
              <Route path="/approvals" element={<Approvals />} />
              <Route path="/audit" element={<Audit />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </AuthProvider>
  )
}

