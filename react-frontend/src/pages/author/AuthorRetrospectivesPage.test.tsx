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

const session = { status: 'authenticated', user: null, token: 'token', expiresAtUtc: '', sessionExpired: false, signIn: vi.fn(), signOut: vi.fn(), updateUser: vi.fn(), onUnauthorized: vi.fn(), retryRestore: vi.fn() } satisfies SessionContextValue
function renderPage(url = '/dashboard/retrospectives') { return render(<SessionContext.Provider value={session}><MemoryRouter initialEntries={[url]}><AuthorRetrospectivesPage /></MemoryRouter></SessionContext.Provider>) }

beforeEach(() => listOwn.mockReset())

describe('AuthorRetrospectivesPage', () => {
  it('shows loading then an ownership-safe dashboard with status and edit link', async () => {
    listOwn.mockResolvedValue({ items: [ownedRetrospective], page: 1, pageSize: 12, totalCount: 1 })
    renderPage('/dashboard/retrospectives?status=draft')
    expect(screen.getByText('Loading your retrospectives...')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Edit The Oldest House/ })).toHaveAttribute('href', '/dashboard/retrospectives/retro-1/edit')
    expect(screen.getAllByText('Draft').length).toBeGreaterThan(0)
    expect(listOwn).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }), 'token', expect.any(Object))
  })

  it('falls back from invalid filters and reports safe errors', async () => {
    listOwn.mockRejectedValueOnce(new Error('secret owner detail')).mockResolvedValueOnce({ items: [], page: 1, pageSize: 12, totalCount: 0 })
    renderPage('/dashboard/retrospectives?status=archived&page=nope')
    expect(await screen.findByText('Your retrospectives could not be loaded.')).toBeInTheDocument()
    expect(screen.queryByText('secret owner detail')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(listOwn).toHaveBeenCalledTimes(2)
  })
})
