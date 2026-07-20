import { Navigate, Outlet } from 'react-router-dom'
import type { UserRole } from '../api/types'
import { LoadingState } from '../components/feedback/Feedback'
import { useSession } from './useSession'

export function RequireRole({ role }: { role: UserRole }) {
  const session = useSession()
  if (session.status === 'restoring') return <LoadingState label="Checking access..." />
  if (session.status !== 'authenticated') return <Navigate to="/login" replace />
  if (session.user?.role !== role) return <Navigate to="/forbidden" replace />
  return <Outlet />
}
