import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { ApiError } from '../../api/http'
import { SessionContext, type SessionContextValue } from '../../auth/useSession'
import { game, pageOf } from '../../test/publicFixtures'
import { AdminGamesPage } from './AdminGamesPage'

const api = vi.hoisted(() => ({ list: vi.fn(), archive: vi.fn() }))
vi.mock('../../api/gamesApi', () => ({ listGames: api.list, archiveGame: api.archive }))
const session = { status: 'authenticated', user: null, token: 'token', expiresAtUtc: '', sessionExpired: false, signIn: vi.fn(), signOut: vi.fn(), updateUser: vi.fn(), onUnauthorized: vi.fn(), retryRestore: vi.fn() } satisfies SessionContextValue
function renderPage(url = '/admin/games') { return render(<SessionContext.Provider value={session}><MemoryRouter initialEntries={[url]}><AdminGamesPage /></MemoryRouter></SessionContext.Provider>) }

beforeEach(() => { api.list.mockReset(); api.archive.mockReset() })

describe('AdminGamesPage', () => {
  it('loads active games, falls back from invalid query values, and searches and filters through the URL', async () => {
    api.list.mockResolvedValue(pageOf([game], 1, 12))
    renderPage('/admin/games?releaseWindow=invalid&page=nope')
    expect(screen.getByText('Loading games for administration...')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Edit Control' })).toHaveAttribute('href', '/admin/games/game-1/edit')
    expect(api.list).toHaveBeenCalledWith(expect.objectContaining({ releaseWindow: 'all', page: 1 }), expect.any(AbortSignal))
    await userEvent.type(screen.getByLabelText('Search games'), 'quest')
    await userEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'quest' }), expect.any(AbortSignal))
    await userEvent.selectOptions(screen.getByLabelText('Release window'), 'upcoming')
    expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ releaseWindow: 'upcoming' }), expect.any(AbortSignal))
  })

  it('shows an intentional empty state', async () => {
    api.list.mockResolvedValue(pageOf([]))
    renderPage()
    expect(await screen.findByRole('heading', { name: 'No active games found' })).toBeInTheDocument()
  })

  it('distinguishes forbidden and unexpected failures and retries recoverably', async () => {
    api.list.mockRejectedValueOnce(new ApiError(403)).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(pageOf([]))
    const view = renderPage()
    expect(await screen.findByText('You do not have permission to administer games.')).toBeInTheDocument()
    view.unmount()
    renderPage()
    expect(await screen.findByText('Games could not be loaded.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'No active games found' })).toBeInTheDocument()
  })

  it('names the game before archive and explains Author removal and retained attribution', async () => {
    api.list.mockResolvedValue(pageOf([game]))
    api.archive.mockResolvedValue(undefined)
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Archive Control' }))
    expect(screen.getByRole('heading', { name: 'Archive Control?' })).toBeInTheDocument()
    expect(screen.getByText(/published retrospectives will retain Control as their game attribution/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Archive game' }))
    expect(api.archive).toHaveBeenCalledWith('game-1', 'token', expect.any(Object))
    expect(await screen.findByRole('status')).toHaveTextContent('Control was archived and removed from public browsing and Author selection.')
    expect(screen.queryByRole('link', { name: 'Edit Control' })).not.toBeInTheDocument()
  })
})
