import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ApiError } from '../../api/http'
import { LoginPage } from './LoginPage'

const mocks = vi.hoisted(() => ({ login: vi.fn(), signIn: vi.fn() }))
vi.mock('../../api/authApi', () => ({ login: mocks.login }))
vi.mock('../../auth/useSession', () => ({ useSession: () => ({ status: 'anonymous', user: null, signIn: mocks.signIn }) }))

beforeEach(() => { mocks.login.mockReset(); mocks.signIn.mockReset(); sessionStorage.clear() })

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
