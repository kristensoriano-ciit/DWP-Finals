import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingState, PageError } from '../components/feedback/Feedback'
import { useSession } from './useSession'

export function RequireSession() {
  const session = useSession()
  const location = useLocation()

  if (session.status === 'restoring') return <LoadingState label="Restoring your session..." />
  if (session.status === 'restore-failed') return <PageError message="Your session could not be restored." onRetry={session.retryRestore} />
  if (session.status === 'anonymous') {
    const returnPath = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to="/login" replace state={{ returnPath, expired: session.sessionExpired }} />
  }
  return <Outlet />
}
