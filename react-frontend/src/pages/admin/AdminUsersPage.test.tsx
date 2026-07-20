import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ApiError } from '../../api/http'
import type { User } from '../../api/types'
import { SessionContext, type SessionContextValue } from '../../auth/useSession'
import { AdminUsersPage } from './AdminUsersPage'

const api = vi.hoisted(() => ({ list: vi.fn(), deactivate: vi.fn() }))
vi.mock('../../api/usersApi', () => ({ listUsers: api.list, deactivateUser: api.deactivate }))

const admin: User = { id: 'admin-1', displayName: 'Admin Ada', email: 'ada@example.test', role: 'Admin', isActive: true, createdAtUtc: '2026-01-01T00:00:00Z', deactivatedAtUtc: null }
const author: User = { id: 'author-1', displayName: 'Author Alex', email: 'alex@example.test', role: 'Author', isActive: true, createdAtUtc: '2026-02-01T00:00:00Z', deactivatedAtUtc: null }
const inactive: User = { ...author, id: 'author-2', displayName: 'Inactive Ivy', email: 'ivy@example.test', isActive: false, deactivatedAtUtc: '2026-03-01T00:00:00Z' }
const session = { status: 'authenticated', user: admin, token: 'admin-token', expiresAtUtc: '', sessionExpired: false, signIn: vi.fn(), signOut: vi.fn(), updateUser: vi.fn(), onUnauthorized: vi.fn(), retryRestore: vi.fn() } satisfies SessionContextValue
const pageOf = (items: User[], page = 1, pageSize = 20, totalCount = items.length) => ({ items, page, pageSize, totalCount })

function renderPage(url = '/admin/users') {
  return render(<SessionContext.Provider value={session}><MemoryRouter initialEntries={[url]}><AdminUsersPage /></MemoryRouter></SessionContext.Provider>)
}

beforeEach(() => { api.list.mockReset(); api.deactivate.mockReset() })

describe('AdminUsersPage', () => {
  it('shows loading, active/inactive roles and access, self-protection, and paging', async () => {
    api.list.mockResolvedValue(pageOf([admin, author, inactive], 1, 20, 21))
    renderPage()

    expect(screen.getByText('Loading users for administration...')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Author Alex' })).toBeInTheDocument()
    expect(screen.getAllByText('Author')).toHaveLength(2)
    expect(screen.getAllByText('Active')).toHaveLength(2)
    expect(screen.getByText('Inactive')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Deactivate Admin Ada' })).toBeDisabled()
    expect(screen.getByText('This is your account. You cannot deactivate yourself.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Deactivate Inactive Ivy' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(api.list).toHaveBeenLastCalledWith({ page: 2, pageSize: 20 }, 'admin-token', expect.any(Object))
  })

  it('shows an intentional empty state', async () => {
    api.list.mockResolvedValue(pageOf([]))
    renderPage()
    expect(await screen.findByRole('heading', { name: 'No users found' })).toBeInTheDocument()
  })

  it('names the user in confirmation and supports cancellation', async () => {
    api.list.mockResolvedValue(pageOf([author]))
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate Author Alex' }))
    expect(screen.getByRole('heading', { name: 'Deactivate Author Alex?' })).toBeInTheDocument()
    expect(screen.getByText(/existing authenticated session will stop working/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('heading', { name: 'Deactivate Author Alex?' })).not.toBeInTheDocument()
    expect(api.deactivate).not.toHaveBeenCalled()
  })

  it('shows pending state and keeps the deactivated user as inactive', async () => {
    let resolveDeactivate!: () => void
    api.list.mockResolvedValue(pageOf([author]))
    api.deactivate.mockReturnValue(new Promise<void>((resolve) => { resolveDeactivate = resolve }))
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate Author Alex' }))
    await userEvent.click(screen.getByRole('button', { name: 'Deactivate user' }))
    expect(screen.getByRole('button', { name: 'Working...' })).toBeDisabled()
    resolveDeactivate()
    expect(await screen.findByRole('status')).toHaveTextContent("Author Alex's access was deactivated")
    expect(screen.getByText('Inactive')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Deactivate Author Alex' })).toBeDisabled()
  })

  it('distinguishes forbidden and unexpected failures and retries', async () => {
    api.list.mockRejectedValueOnce(new ApiError(403)).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(pageOf([]))
    const view = renderPage()
    expect(await screen.findByText('You do not have permission to administer users.')).toBeInTheDocument()
    view.unmount()

    renderPage()
    expect(await screen.findByText('Users could not be loaded.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'No users found' })).toBeInTheDocument()
  })

  it('reports an unexpected deactivation failure and leaves access active', async () => {
    api.list.mockResolvedValue(pageOf([author]))
    api.deactivate.mockRejectedValue(new Error('offline'))
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate Author Alex' }))
    await userEvent.click(screen.getByRole('button', { name: 'Deactivate user' }))
    expect(await screen.findByRole('status')).toHaveTextContent("Author Alex's access could not be deactivated")
    expect(screen.getByText('Active')).toBeInTheDocument()
  })
})
