import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom'
import { ApiError } from '../../api/http'
import { RegisterPage } from './RegisterPage'

const mocks = vi.hoisted(() => ({ register: vi.fn(), login: vi.fn(), signIn: vi.fn() }))
vi.mock('../../api/authApi', () => ({ register: mocks.register, login: mocks.login }))
vi.mock('../../auth/useSession', () => ({ useSession: () => ({ status: 'anonymous', user: null, signIn: mocks.signIn }) }))

beforeEach(() => Object.values(mocks).forEach((mock) => mock.mockReset()))

it('validates registration and reports duplicate email without clearing safe values', async () => {
  render(<MemoryRouter><RegisterPage /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: /create account/i }))
  expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
  await userEvent.type(screen.getByLabelText(/display name/i), 'Ada')
  await userEvent.type(screen.getByLabelText(/email/i), 'ada@example.test')
  await userEvent.type(screen.getByLabelText(/^password/i), 'password')
  mocks.register.mockRejectedValueOnce(new ApiError(409, { detail: 'An account with this email already exists.' }))
  fireEvent.click(screen.getByRole('button', { name: /create account/i }))
  expect(await screen.findByText(/already exists/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/display name/i)).toHaveValue('Ada')
})

it('prevents repeated registration while submission is pending', async () => {
  let resolve!: () => void
  mocks.register.mockReturnValue(new Promise<void>((done) => { resolve = done }))
  render(<MemoryRouter><RegisterPage /></MemoryRouter>)
  fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: 'Ada' } })
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'ada@example.test' } })
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'password' } })
  fireEvent.click(screen.getByRole('button', { name: /create account/i }))
  expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled()
  expect(mocks.register).toHaveBeenCalledTimes(1)
  await act(async () => resolve())
})

it('signs in and opens the Author dashboard after registration', async () => {
  const auth = {
    accessToken: 'token',
    expiresAtUtc: '2026-07-22T00:00:00Z',
    user: { id: 'author-1', displayName: 'Ada', email: 'ada@example.test', role: 'Author' as const, isActive: true, createdAtUtc: '', deactivatedAtUtc: null },
  }
  mocks.register.mockResolvedValue(auth.user)
  mocks.login.mockResolvedValue(auth)
  const router = createMemoryRouter([
    { path: '/register', element: <RegisterPage /> },
    { path: '/dashboard/retrospectives', element: <h1>Author dashboard</h1> },
  ], { initialEntries: ['/register'] })
  render(<RouterProvider router={router} />)

  await userEvent.type(screen.getByLabelText(/display name/i), 'Ada')
  await userEvent.type(screen.getByLabelText(/email/i), 'ada@example.test')
  await userEvent.type(screen.getByLabelText(/^password/i), 'password')
  await userEvent.click(screen.getByRole('button', { name: /create account/i }))

  expect(await screen.findByRole('heading', { name: 'Author dashboard' })).toBeInTheDocument()
  expect(mocks.login).toHaveBeenCalledWith({ email: 'ada@example.test', password: 'password' })
  expect(mocks.signIn).toHaveBeenCalledWith(auth)
})
