import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom'
import { ApiError } from '../../api/http'
import { LoginPage } from './LoginPage'

const mocks = vi.hoisted(() => ({ login: vi.fn(), signIn: vi.fn(), session: { status: 'anonymous', user: null, signIn: vi.fn() } as Record<string, unknown> }))
vi.mock('../../api/authApi', () => ({ login: mocks.login }))
vi.mock('../../auth/useSession', () => ({ useSession: () => mocks.session }))

beforeEach(() => {
  mocks.login.mockReset(); mocks.signIn.mockReset(); sessionStorage.clear()
  mocks.session = { status: 'anonymous', user: null, signIn: mocks.signIn }
})

it('validates fields and preserves the email after rejected credentials', async () => {
  render(<MemoryRouter><LoginPage /></MemoryRouter>)
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
  expect(screen.getAllByText(/valid email/i)).toHaveLength(2)
  await userEvent.type(screen.getByLabelText(/email/i), 'ada@example.test')
  await userEvent.type(screen.getByLabelText(/password/i), 'wrong-password')
  mocks.login.mockRejectedValueOnce(new ApiError(401, { detail: 'Email or password is incorrect.' }))
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
  expect(await screen.findByText('Email or password is incorrect.')).toBeInTheDocument()
  expect(screen.getByLabelText(/email/i)).toHaveValue('ada@example.test')
})

it('prevents repeated submission while login is pending', async () => {
  mocks.login.mockReturnValue(new Promise(() => {}))
  render(<MemoryRouter><LoginPage /></MemoryRouter>)
  await userEvent.type(screen.getByLabelText(/email/i), 'ada@example.test')
  await userEvent.type(screen.getByLabelText(/password/i), 'password')
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
  expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
  expect(mocks.login).toHaveBeenCalledTimes(1)
})

it('preserves a safe protected return path when authentication completes', () => {
  mocks.session = { status: 'authenticated', user: { role: 'Author' }, signIn: mocks.signIn }
  const router = createMemoryRouter([
    { path: '/login', element: <LoginPage /> },
    { path: '/account', element: <p>Account</p> },
  ], { initialEntries: [{ pathname: '/login', state: { returnPath: '/account?tab=profile#name' } }] })
  render(<RouterProvider router={router} />)
  expect(router.state.location.pathname).toBe('/account')
  expect(router.state.location.search).toBe('?tab=profile')
  expect(router.state.location.hash).toBe('#name')
})

it('shows and consumes password-change confirmation after forced sign-out navigation', () => {
  sessionStorage.setItem('checkpoint.passwordChanged', 'true')
  render(<MemoryRouter><LoginPage /></MemoryRouter>)
  expect(screen.getByRole('status')).toHaveTextContent('Password changed')
  expect(sessionStorage.getItem('checkpoint.passwordChanged')).toBeNull()
})
