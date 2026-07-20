import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ApiError } from '../../api/http'
import { RegisterPage } from './RegisterPage'

const mocks = vi.hoisted(() => ({ register: vi.fn() }))
vi.mock('../../api/authApi', () => ({ register: mocks.register }))
vi.mock('../../auth/useSession', () => ({ useSession: () => ({ status: 'anonymous', user: null }) }))

beforeEach(() => mocks.register.mockReset())

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
