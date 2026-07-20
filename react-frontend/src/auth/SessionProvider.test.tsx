import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { SessionProvider } from './SessionProvider'
import { useSession } from './useSession'
import * as authApi from '../api/authApi'
import { ApiError } from '../api/http'

const user = { id: '1', displayName: 'Ada', email: 'ada@example.test', role: 'Author' as const, isActive: true, createdAtUtc: '', deactivatedAtUtc: null }
const validAuth = { accessToken: 'token', expiresAtUtc: '2099-01-01T00:00:00Z', user }

function wrapper({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}

beforeEach(() => sessionStorage.clear())
afterEach(() => vi.useRealTimers())

it('starts anonymous without stored credentials and accepts and clears a login', async () => {
  const { result } = renderHook(useSession, { wrapper })
  await waitFor(() => expect(result.current.status).toBe('anonymous'))
  act(() => result.current.signIn(validAuth))
  expect(result.current.user).toEqual(user)
  expect(sessionStorage.getItem('checkpoint.accessToken')).toBe('token')
  act(() => result.current.signOut())
  expect(result.current.status).toBe('anonymous')
  expect(sessionStorage.length).toBe(0)
})

it('restores and validates a valid stored session', async () => {
  sessionStorage.setItem('checkpoint.accessToken', 'token')
  sessionStorage.setItem('checkpoint.expiresAtUtc', validAuth.expiresAtUtc)
  vi.spyOn(authApi, 'getCurrentProfile').mockResolvedValue(user)
  const { result } = renderHook(useSession, { wrapper })
  expect(result.current.status).toBe('restoring')
  await waitFor(() => expect(result.current.status).toBe('authenticated'))
  expect(result.current.user).toEqual(user)
})

it('rejects expired or invalid stored sessions', async () => {
  sessionStorage.setItem('checkpoint.accessToken', 'token')
  sessionStorage.setItem('checkpoint.expiresAtUtc', '2000-01-01T00:00:00Z')
  const { result } = renderHook(useSession, { wrapper })
  await waitFor(() => expect(result.current.status).toBe('anonymous'))
  expect(sessionStorage.length).toBe(0)
  expect(vi.spyOn(authApi, 'getCurrentProfile')).not.toHaveBeenCalled()
})

it('clears stored credentials when profile restoration is rejected', async () => {
  sessionStorage.setItem('checkpoint.accessToken', 'token')
  sessionStorage.setItem('checkpoint.expiresAtUtc', validAuth.expiresAtUtc)
  vi.spyOn(authApi, 'getCurrentProfile').mockRejectedValue(new ApiError(401))
  const { result } = renderHook(useSession, { wrapper })
  await waitFor(() => expect(result.current.status).toBe('anonymous'))
  expect(sessionStorage.length).toBe(0)
})

it('preserves stored credentials after a transient restoration failure and retries', async () => {
  sessionStorage.setItem('checkpoint.accessToken', 'token')
  sessionStorage.setItem('checkpoint.expiresAtUtc', validAuth.expiresAtUtc)
  vi.spyOn(authApi, 'getCurrentProfile').mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(user)
  const { result } = renderHook(useSession, { wrapper })
  await waitFor(() => expect(result.current.status).toBe('restore-failed'))
  expect(sessionStorage.getItem('checkpoint.accessToken')).toBe('token')
  act(() => result.current.retryRestore())
  await waitFor(() => expect(result.current.status).toBe('authenticated'))
})

it('invalidates an authenticated session when its expiry time arrives', async () => {
  vi.useFakeTimers()
  const expiresAtUtc = new Date(Date.now() + 1_000).toISOString()
  const { result } = renderHook(useSession, { wrapper })
  act(() => result.current.signIn({ ...validAuth, expiresAtUtc }))
  await act(() => vi.advanceTimersByTimeAsync(1_001))
  expect(result.current.status).toBe('anonymous')
  expect(result.current.sessionExpired).toBe(true)
  expect(sessionStorage.length).toBe(0)
})

it('invalidates the session through the protected-request callback', async () => {
  const { result } = renderHook(useSession, { wrapper })
  await waitFor(() => expect(result.current.status).toBe('anonymous'))
  act(() => result.current.signIn(validAuth))
  act(() => result.current.onUnauthorized())
  expect(result.current.status).toBe('anonymous')
  expect(result.current.sessionExpired).toBe(true)
})
