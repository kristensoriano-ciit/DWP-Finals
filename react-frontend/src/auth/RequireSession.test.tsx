import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { SessionContextValue } from './useSession'
import { SessionContext } from './useSession'
import { RequireSession } from './RequireSession'
import { safeReturnPath } from './safeReturnPath'

const anonymous: SessionContextValue = { status: 'anonymous', user: null, token: null, expiresAtUtc: null, sessionExpired: false, signIn: vi.fn(), signOut: vi.fn(), updateUser: vi.fn(), onUnauthorized: vi.fn(), retryRestore: vi.fn() }

function renderGuard(value: SessionContextValue, path = '/account?tab=profile#name') {
  return render(<SessionContext.Provider value={value}><MemoryRouter initialEntries={[path]}><Routes><Route path="/login" element={<p>Login</p>} /><Route element={<RequireSession />}><Route path="/account" element={<p>Private</p>} /></Route></Routes></MemoryRouter></SessionContext.Provider>)
}

it('waits while restoring, redirects anonymous users, and renders authenticated users', () => {
  const restoring = { ...anonymous, status: 'restoring' as const }
  const view = renderGuard(restoring)
  expect(screen.getByText(/restoring/i)).toBeInTheDocument()
  view.unmount()
  const anonymousView = renderGuard(anonymous)
  expect(screen.getByText('Login')).toBeInTheDocument()
  const authenticated = { ...anonymous, status: 'authenticated' as const, token: 'token', user: { id: '1', displayName: 'Ada', email: 'a@b.test', role: 'Author' as const, isActive: true, createdAtUtc: '', deactivatedAtUtc: null } }
  anonymousView.unmount()
  renderGuard(authenticated)
  expect(screen.getByText('Private')).toBeInTheDocument()
})

it.each([
  ['https://evil.test', '/'], ['//evil.test', '/'], ['/%2f%2fevil.test', '/'], ['/\\evil', '/'], ['/%5cevil', '/'], ['/%E0%A4%A', '/'], ['/admin?tab=1#users', '/'], ['/dashboard/retrospectives?page=2#mine', '/dashboard/retrospectives?page=2#mine'],
])('normalizes %s to %s for an Author', (input, expected) => {
  expect(safeReturnPath(input, 'Author')).toBe(expected)
})
