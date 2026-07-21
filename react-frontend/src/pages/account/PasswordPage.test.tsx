import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ApiError } from '../../api/http'
import { PasswordPage } from './PasswordPage'

const mocks = vi.hoisted(() => ({ changePassword: vi.fn(), signOut: vi.fn(), onUnauthorized: vi.fn(), session: null as unknown }))
vi.mock('../../api/authApi', () => ({ changePassword: mocks.changePassword }))
vi.mock('../../auth/useSession', () => ({ useSession: () => mocks.session }))

beforeEach(() => {
  mocks.changePassword.mockReset()
  mocks.signOut.mockReset()
  mocks.onUnauthorized.mockReset()
  mocks.session = { status: 'authenticated', token: 'token', signOut: mocks.signOut, onUnauthorized: mocks.onUnauthorized, sessionExpired: false }
})

it('validates the new password and signs out after a successful change', async () => {
  mocks.changePassword.mockResolvedValue(undefined)
  render(<MemoryRouter><PasswordPage /></MemoryRouter>)
  await userEvent.type(screen.getByLabelText(/current password/i), 'old-password')
  await userEvent.type(screen.getByLabelText(/new password/i), 'short')
  fireEvent.click(screen.getByRole('button', { name: /change password/i }))
  expect(screen.getAllByText(/between 8 and 128/i)).toHaveLength(2)
  await userEvent.clear(screen.getByLabelText(/new password/i))
  await userEvent.type(screen.getByLabelText(/new password/i), 'new-password')
  fireEvent.click(screen.getByRole('button', { name: /change password/i }))
  expect(await screen.findByText(/password changed/i)).toBeInTheDocument()
  expect(mocks.signOut).toHaveBeenCalled()
  expect(sessionStorage.getItem('checkpoint.passwordChanged')).toBe('true')
})

it('prevents repeated password changes while pending', async () => {
  mocks.changePassword.mockReturnValue(new Promise(() => {}))
  render(<MemoryRouter><PasswordPage /></MemoryRouter>)
  await userEvent.type(screen.getByLabelText(/current password/i), 'old-password')
  await userEvent.type(screen.getByLabelText(/new password/i), 'new-password')
  fireEvent.click(screen.getByRole('button', { name: /change password/i }))
  expect(screen.getByRole('button', { name: /changing password/i })).toBeDisabled()
  expect(mocks.changePassword).toHaveBeenCalledTimes(1)
})

it('reports a rejected current password and preserves both fields', async () => {
  mocks.changePassword.mockRejectedValue(new ApiError(400, { detail: 'Current password is incorrect.' }))
  render(<MemoryRouter><PasswordPage /></MemoryRouter>)
  await userEvent.type(screen.getByLabelText(/current password/i), 'wrong-password')
  await userEvent.type(screen.getByLabelText(/new password/i), 'new-password')
  fireEvent.click(screen.getByRole('button', { name: /change password/i }))
  expect(await screen.findByText(/current password is incorrect/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/current password/i)).toHaveValue('wrong-password')
  expect(screen.getByLabelText(/new password/i)).toHaveValue('new-password')
})
