import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionContext, type SessionContextValue } from '../../auth/useSession'
import { ownedRetrospective } from '../../test/authorFixtures'
import { AuthorRetrospectivesPage } from './AuthorRetrospectivesPage'

const listOwn = vi.fn()
vi.mock('../../api/retrospectivesApi', () => ({ listOwnRetrospectives: (...args: unknown[]) => listOwn(...args) }))
vi.mock('../../api/gamesApi', () => ({ listAllGames: vi.fn().mockResolvedValue([]) }))
vi.mock('../../components/dashboard/DashboardPanels', () => ({ DashboardPanels: () => <div data-testid="dashboard-panels" /> }))

const session = { status: 'authenticated', user: null, token: 'token', expiresAtUtc: '', sessionExpired: false, signIn: vi.fn(), signOut: vi.fn(), updateUser: vi.fn(), onUnauthorized: vi.fn(), retryRestore: vi.fn() } satisfies SessionContextValue
function renderPage(url = '/dashboard/retrospectives', fixedStatus?: 'unpublished') { return render(<SessionContext.Provider value={session}><MemoryRouter initialEntries={[url]}><AuthorRetrospectivesPage fixedStatus={fixedStatus} /></MemoryRouter></SessionContext.Provider>) }

beforeEach(() => listOwn.mockReset())

describe('AuthorRetrospectivesPage', () => {
  it('shows loading then an ownership-safe dashboard with status and edit link', async () => {
    listOwn.mockResolvedValue({ items: [ownedRetrospective], page: 1, pageSize: 12, totalCount: 1 })
    renderPage('/dashboard/retrospectives?status=draft')
    expect(screen.getByText('Loading your retrospectives...')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Edit The Oldest House/ })).toHaveAttribute('href', '/dashboard/retrospectives/retro-1/edit')
    expect(screen.getAllByText('Draft').length).toBeGreaterThan(0)
    expect(listOwn).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }), 'token', expect.any(Object))
    expect(screen.getByRole('link', { name: 'View unpublished' })).toHaveAttribute('href', '/dashboard/retrospectives/unpublished')
    expect(screen.getByTestId('dashboard-panels')).toBeInTheDocument()
  })

  it('falls back from invalid filters and reports safe errors', async () => {
    listOwn.mockRejectedValueOnce(new Error('secret owner detail')).mockResolvedValueOnce({ items: [], page: 1, pageSize: 12, totalCount: 0 })
    renderPage('/dashboard/retrospectives?status=archived&page=nope')
    expect(await screen.findByText('Your retrospectives could not be loaded.')).toBeInTheDocument()
    expect(screen.queryByText('secret owner detail')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(listOwn).toHaveBeenCalledTimes(2)
  })

  it('fixes the unpublished view status and displays the persisted reason column', async () => {
    const unpublished = { ...ownedRetrospective, status: 'unpublished' as const, unpublishedReason: 'The story needs source attribution.' }
    listOwn.mockResolvedValue({ items: [unpublished], page: 1, pageSize: 12, totalCount: 1 })

    renderPage('/dashboard/retrospectives/unpublished?status=draft', 'unpublished')

    expect(await screen.findByRole('heading', { name: 'Unpublished Retrospectives' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Reason' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'The story needs source attribution.' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to all retrospectives' })).toHaveAttribute('href', '/dashboard/retrospectives')
    expect(listOwn).toHaveBeenCalledWith(expect.objectContaining({ status: 'unpublished' }), 'token', expect.any(Object))
  })
})
