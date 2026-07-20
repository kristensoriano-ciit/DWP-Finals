import { useEffect, useState, type ReactNode } from 'react'
import { getCurrentProfile } from '../api/authApi'
import { ApiError } from '../api/http'
import type { AuthResponse, User } from '../api/types'
import { SessionContext, type SessionContextValue, type SessionStatus } from './useSession'

const TOKEN_KEY = 'checkpoint.accessToken'
const EXPIRY_KEY = 'checkpoint.expiresAtUtc'

type SessionState = {
  status: SessionStatus
  user: User | null
  token: string | null
  expiresAtUtc: string | null
  sessionExpired: boolean
}

const restoring: SessionState = { status: 'restoring', user: null, token: null, expiresAtUtc: null, sessionExpired: false }

function clearStoredSession() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(EXPIRY_KEY)
}

function initialSession(): SessionState {
  const token = sessionStorage.getItem(TOKEN_KEY)
  const expiresAtUtc = sessionStorage.getItem(EXPIRY_KEY)
  const expiry = expiresAtUtc ? Date.parse(expiresAtUtc) : Number.NaN
  if (token && expiresAtUtc && Number.isFinite(expiry) && expiry > Date.now()) {
    return { ...restoring, token, expiresAtUtc }
  }
  clearStoredSession()
  return { ...restoring, status: 'anonymous' }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>(initialSession)

  useEffect(() => {
    if (session.status !== 'restoring' || !session.token || !session.expiresAtUtc) return
    const { token, expiresAtUtc } = session

    let active = true
    getCurrentProfile(token)
      .then((user) => {
        if (active && user.isActive) setSession({ status: 'authenticated', user, token, expiresAtUtc, sessionExpired: false })
        else if (active) {
          clearStoredSession()
          setSession({ ...restoring, status: 'anonymous' })
        }
      })
      .catch((error: unknown) => {
        if (!active) return
        if (error instanceof ApiError && error.status === 401) {
          clearStoredSession()
          setSession({ ...restoring, status: 'anonymous', sessionExpired: true })
        } else {
          setSession((current) => ({ ...current, status: 'restore-failed' }))
        }
      })
    return () => { active = false }
  }, [session])

  useEffect(() => {
    if (session.status !== 'authenticated' || !session.expiresAtUtc) return
    const expire = () => {
      clearStoredSession()
      setSession({ ...restoring, status: 'anonymous', sessionExpired: true })
    }
    let timeout: number | undefined
    const schedule = () => {
      const remaining = Date.parse(session.expiresAtUtc!) - Date.now()
      if (remaining <= 0) { expire(); return }
      timeout = window.setTimeout(schedule, Math.min(remaining, 2_147_483_647))
    }
    schedule()
    return () => window.clearTimeout(timeout)
  }, [session.status, session.expiresAtUtc])

  function signIn(auth: AuthResponse) {
    sessionStorage.setItem(TOKEN_KEY, auth.accessToken)
    sessionStorage.setItem(EXPIRY_KEY, auth.expiresAtUtc)
    setSession({ status: 'authenticated', user: auth.user, token: auth.accessToken, expiresAtUtc: auth.expiresAtUtc, sessionExpired: false })
  }

  function signOut() {
    clearStoredSession()
    setSession({ ...restoring, status: 'anonymous' })
  }

  function onUnauthorized() {
    clearStoredSession()
    setSession({ ...restoring, status: 'anonymous', sessionExpired: true })
  }

  function retryRestore() {
    setSession((current) => current.status === 'restore-failed' ? { ...current, status: 'restoring' } : current)
  }

  const value: SessionContextValue = { ...session, signIn, signOut, updateUser: (user) => setSession((current) => ({ ...current, user })), onUnauthorized, retryRestore }
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
