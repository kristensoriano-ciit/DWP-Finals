import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { SessionContext, type SessionContextValue } from './useSession'
import { RequireRole } from './RequireRole'

const base = { status: 'authenticated' as const, token: 'token', expiresAtUtc: '2099-01-01', sessionExpired: false, signIn: vi.fn(), signOut: vi.fn(), updateUser: vi.fn(), onUnauthorized: vi.fn(), retryRestore: vi.fn() }
const user = { id: '1', displayName: 'Ada', email: 'a@b.test', role: 'Author' as const, isActive: true, createdAtUtc: '', deactivatedAtUtc: null }

function renderRole(value: SessionContextValue, role: 'Author' | 'Admin') {
  render(<SessionContext.Provider value={value}><MemoryRouter initialEntries={['/protected']}><Routes><Route path="/forbidden" element={<p>Forbidden</p>} /><Route element={<RequireRole role={role} />}><Route path="/protected" element={<p>Allowed</p>} /></Route></Routes></MemoryRouter></SessionContext.Provider>)
}

it('allows the required role and preserves a forbidden session', () => {
  renderRole({ ...base, user }, 'Author')
  expect(screen.getByText('Allowed')).toBeInTheDocument()
})

it('redirects the wrong authenticated role without signing out', () => {
  renderRole({ ...base, user }, 'Admin')
  expect(screen.getByText('Forbidden')).toBeInTheDocument()
  expect(base.signOut).not.toHaveBeenCalled()
})
