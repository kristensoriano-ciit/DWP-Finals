import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ApiError } from '../../api/http'
import { AccountPage } from './AccountPage'

const user = { id: '1', displayName: 'Ada', email: 'ada@example.test', role: 'Author' as const, isActive: true, createdAtUtc: '', deactivatedAtUtc: null }
const mocks = vi.hoisted(() => ({ updateProfile: vi.fn(), updateUser: vi.fn(), onUnauthorized: vi.fn(), session: null as unknown }))
vi.mock('../../api/authApi', () => ({ updateProfile: mocks.updateProfile }))
vi.mock('../../auth/useSession', () => ({ useSession: () => mocks.session }))

beforeEach(() => {
  mocks.updateProfile.mockReset()
  mocks.updateUser.mockReset()
  mocks.onUnauthorized.mockReset()
  mocks.session = { status: 'authenticated', user, token: 'token', updateUser: mocks.updateUser, onUnauthorized: mocks.onUnauthorized, sessionExpired: false }
})

it('validates, protects pending profile updates, and announces success', async () => {
  let resolve!: (value: typeof user) => void
  mocks.updateProfile.mockReturnValue(new Promise((done) => { resolve = done }))
  render(<MemoryRouter><AccountPage /></MemoryRouter>)
  await userEvent.clear(screen.getByLabelText(/display name/i))
  await userEvent.click(screen.getByRole('button', { name: /save profile/i }))
  expect(screen.getAllByText(/between 2 and 50/i)).toHaveLength(2)
  await userEvent.type(screen.getByLabelText(/display name/i), 'Grace')
  await userEvent.click(screen.getByRole('button', { name: /save profile/i }))
  expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
  resolve({ ...user, displayName: 'Grace' })
  expect(await screen.findByText(/profile updated/i)).toBeInTheDocument()
})

it('shows restoring and expired-session states', () => {
  mocks.session = { status: 'restoring', user: null, token: null, sessionExpired: false }
  const view = render(<MemoryRouter><AccountPage /></MemoryRouter>)
  expect(screen.getByText(/loading your account/i)).toBeInTheDocument()
  view.unmount()
  mocks.session = { status: 'anonymous', user: null, token: null, sessionExpired: true }
  render(<MemoryRouter><AccountPage /></MemoryRouter>)
  expect(screen.getByText(/session expired/i)).toBeInTheDocument()
})

it('reports update errors without clearing profile values', async () => {
  mocks.updateProfile.mockRejectedValue(new ApiError(409, { detail: 'That email is already in use.' }))
  render(<MemoryRouter><AccountPage /></MemoryRouter>)
  await userEvent.click(screen.getByRole('button', { name: /save profile/i }))
  expect(await screen.findByText(/already in use/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/display name/i)).toHaveValue('Ada')
})
