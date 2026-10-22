import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell, homeFor } from '@/components/AppShell'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Approvals from '@/pages/Approvals'
import Audit from '@/pages/Audit'
import Chat from '@/pages/Chat'
import Login from '@/pages/Login'
import { StoreProvider, useStore } from '@/store'

function Home() {
  const { state } = useStore()
  return <Navigate to={state.user ? homeFor(state.user.role) : '/login'} replace />
}

export default function App() {
  return (
    <StoreProvider>
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
    </StoreProvider>
  )
}
