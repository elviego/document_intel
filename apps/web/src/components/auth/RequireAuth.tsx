import { Navigate, useLocation } from 'react-router-dom'
import { auth } from '@/lib/auth'

interface Props {
  children: React.ReactNode
  role?: 'admin' | 'staff' | 'accountant'
}

export function RequireAuth({ children, role }: Props) {
  const location = useLocation()
  const user = auth.getUser()

  if (!auth.isAuthenticated()) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  if (role && user?.role !== role) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
