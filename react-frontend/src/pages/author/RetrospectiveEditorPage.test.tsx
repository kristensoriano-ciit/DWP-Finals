import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/http'
import { SessionContext, type SessionContextValue } from '../../auth/useSession'
import { ownedRetrospective } from '../../test/authorFixtures'
import { RetrospectiveEditorPage } from './RetrospectiveEditorPage'

const api = vi.hoisted(() => ({ get: vi.fn(), create: vi.fn(), update: vi.fn(), status: vi.fn(), archive: vi.fn(), games: vi.fn() }))
vi.mock('../../api/retrospectivesApi', () => ({ getOwnRetrospective: api.get, createRetrospective: api.create, updateRetrospective: api.update, changeRetrospectiveStatus: api.status, archiveRetrospective: api.archive }))
vi.mock('../../api/gamesApi', () => ({ listAllGames: api.games }))

const session = { status: 'authenticated', user: { id: 'user-1', displayName: 'Ada', email: 'ada@example.test', role: 'Author', isActive: true, createdAtUtc: '', deactivatedAtUtc: null }, token: 'token', expiresAtUtc: '', sessionExpired: false, signIn: vi.fn(), signOut: vi.fn(), updateUser: vi.fn(), onUnauthorized: vi.fn(), retryRestore: vi.fn() } satisfies SessionContextValue
function renderEditor(path: string) {
  const router = createMemoryRouter([{ path: '/dashboard/retrospectives/new', element: <RetrospectiveEditorPage /> }, { path: '/dashboard/retrospectives/:retrospectiveId/edit', element: <RetrospectiveEditorPage /> }, { path: '/dashboard/retrospectives', element: <p>Dashboard</p> }], { initialEntries: [path] })
  render(<SessionContext.Provider value={session}><RouterProvider router={router} /></SessionContext.Provider>)
  return router
}

beforeEach(() => { sessionStorage.clear(); Object.values(api).forEach((mock) => mock.mockReset()); api.games.mockResolvedValue([{ id: 'game-1', title: 'Control' }]) })

describe('RetrospectiveEditorPage', () => {
  it('creates with the selected initial status and prevents repeated submission', async () => {
    let resolve!: (value: typeof ownedRetrospective) => void
    api.create.mockReturnValue(new Promise((done) => { resolve = done }))
    const router = renderEditor('/dashboard/retrospectives/new')
    await screen.findByLabelText('Game')
    await userEvent.selectOptions(screen.getByLabelText('Game'), 'game-1')
    await userEvent.type(screen.getByLabelText('Title'), 'A new look')
    await userEvent.type(screen.getByLabelText('Retrospective'), 'Still excellent')
    await userEvent.selectOptions(screen.getByLabelText('Initial status'), 'published')
    await userEvent.click(screen.getByRole('button', { name: 'Create retrospective' }))
    expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'published' }), 'token', expect.any(Object))
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()
    resolve(ownedRetrospective)
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/retrospectives/retro-1/edit'))
    expect(screen.queryByRole('alertdialog', { name: 'Leave with unsaved changes?' })).not.toBeInTheDocument()
  })

  it('preserves edited text and offers the current server version after conflict', async () => {
    api.get.mockResolvedValue(ownedRetrospective)
    api.update.mockRejectedValue(new ApiError(409, { detail: 'stale' }))
    renderEditor('/dashboard/retrospectives/retro-1/edit')
    const title = await screen.findByLabelText('Title')
    await userEvent.clear(title)
    await userEvent.type(title, 'My preserved draft')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText(/another version was saved/i)).toBeInTheDocument()
    expect(title).toHaveValue('My preserved draft')
    expect(api.update).toHaveBeenCalledWith('retro-1', expect.objectContaining({ rowVersion: 'AAAAAQ==' }), 'token', expect.any(Object))
  })

  it('stores a safe draft when the session expires', async () => {
    api.create.mockRejectedValue(new ApiError(401))
    renderEditor('/dashboard/retrospectives/new')
    await screen.findByLabelText('Game')
    await userEvent.selectOptions(screen.getByLabelText('Game'), 'game-1')
    await userEvent.type(screen.getByLabelText('Title'), 'Recover me')
    await userEvent.type(screen.getByLabelText('Retrospective'), 'Draft body')
    await userEvent.click(screen.getByRole('button', { name: 'Create retrospective' }))
    expect(sessionStorage.getItem('checkpoint:retrospective-draft:user-1:new')).toContain('Recover me')
    expect(session.onUnauthorized).toHaveBeenCalled()
  })

  it('restores only the signed-in owner draft and cleans it after a successful save', async () => {
    sessionStorage.setItem('checkpoint:retrospective-draft:user-1:new', JSON.stringify({
      gameId: 'game-1', title: 'Recovered title', reviewContent: 'Recovered body', imageUrl: '', rating: 8,
      status: 'draft', unpublishedReason: '', retrospectiveId: 'new', userId: 'user-1', savedAtUtc: new Date().toISOString(),
    }))
    api.create.mockResolvedValue(ownedRetrospective)
    renderEditor('/dashboard/retrospectives/new')
    expect(await screen.findByLabelText('Title')).toHaveValue('Recovered title')
    expect(screen.getByText(/draft was restored/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Create retrospective' }))
    expect(sessionStorage.getItem('checkpoint:retrospective-draft:user-1:new')).toBeNull()
  })

  it('preserves edited values after an unexpected save failure', async () => {
    api.create.mockRejectedValue(new Error('timeout'))
    renderEditor('/dashboard/retrospectives/new')
    await screen.findByLabelText('Game')
    await userEvent.selectOptions(screen.getByLabelText('Game'), 'game-1')
    await userEvent.type(screen.getByLabelText('Title'), 'Keep this title')
    await userEvent.type(screen.getByLabelText('Retrospective'), 'Keep this body')
    await userEvent.click(screen.getByRole('button', { name: 'Create retrospective' }))
    expect(await screen.findByText(/draft is still here/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('Keep this title')
  })

  it('changes lifecycle status and archives only after confirmation', async () => {
    api.get.mockResolvedValue(ownedRetrospective)
    api.status.mockResolvedValue({ ...ownedRetrospective, status: 'published' })
    api.archive.mockResolvedValue(undefined)
    const router = renderEditor('/dashboard/retrospectives/retro-1/edit')
    await screen.findByLabelText('Change status')
    await userEvent.selectOptions(screen.getByLabelText('Change status'), 'published')
    await userEvent.click(screen.getByRole('button', { name: 'Update status' }))
    expect(api.status).toHaveBeenCalledWith('retro-1', expect.objectContaining({ status: 'published', rowVersion: 'AAAAAQ==' }), 'token', expect.any(Object))
    await userEvent.click(screen.getByRole('button', { name: 'Archive' }))
    expect(api.archive).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Archive retrospective' }))
    expect(api.archive).toHaveBeenCalledWith('retro-1', 'AAAAAQ==', 'token', expect.any(Object))
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/retrospectives'))
  })

  it('shows a visible editor failure when game options cannot be completed', async () => {
    api.games.mockRejectedValue(new Error('page two failed'))
    renderEditor('/dashboard/retrospectives/new')
    expect(await screen.findByText('The editor could not be loaded.')).toBeInTheDocument()
  })
})
