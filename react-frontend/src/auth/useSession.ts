import { createContext, useContext } from 'react'
import type { AuthResponse, User } from '../api/types'

export type SessionStatus = 'restoring' | 'restore-failed' | 'anonymous' | 'authenticated'

export type SessionContextValue = {
  status: SessionStatus
  user: User | null
  token: string | null
  expiresAtUtc: string | null
  sessionExpired: boolean
  signIn: (auth: AuthResponse) => void
  signOut: () => void
  updateUser: (user: User) => void
  onUnauthorized: () => void
  retryRestore: () => void
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession() {
  const session = useContext(SessionContext)
  if (!session) throw new Error('useSession must be used within SessionProvider.')
  return session
}

export function useOptionalSession() {
  return useContext(SessionContext)
}
