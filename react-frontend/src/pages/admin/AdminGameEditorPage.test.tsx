import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/http'
import { SessionContext, type SessionContextValue } from '../../auth/useSession'
import { game } from '../../test/publicFixtures'
import { AdminGameEditorPage } from './AdminGameEditorPage'

const api = vi.hoisted(() => ({ get: vi.fn(), create: vi.fn(), update: vi.fn() }))
vi.mock('../../api/gamesApi', () => ({ getGame: api.get, createGame: api.create, updateGame: api.update }))
const session = { status: 'authenticated', user: null, token: 'token', expiresAtUtc: '', sessionExpired: false, signIn: vi.fn(), signOut: vi.fn(), updateUser: vi.fn(), onUnauthorized: vi.fn(), retryRestore: vi.fn() } satisfies SessionContextValue
function renderEditor(path: string) {
  const router = createMemoryRouter([{ path: '/admin/games/new', element: <AdminGameEditorPage /> }, { path: '/admin/games/:gameId/edit', element: <AdminGameEditorPage /> }, { path: '/admin/games', element: <p>Game administration</p> }], { initialEntries: [path] })
  render(<SessionContext.Provider value={session}><RouterProvider router={router} /></SessionContext.Provider>)
  return router
}
beforeEach(() => Object.values(api).forEach((mock) => mock.mockReset()))

describe('AdminGameEditorPage', () => {
  it('creates a game once, preserves controlled values while pending, and returns to game administration', async () => {
    let resolve!: (value: typeof game) => void
    api.create.mockReturnValue(new Promise((done) => { resolve = done }))
    renderEditor('/admin/games/new')
    await userEvent.type(screen.getByLabelText('Title'), 'Control')
    await userEvent.type(screen.getByLabelText('Release date'), '2019-08-27')
    await userEvent.click(screen.getByRole('button', { name: 'Create game' }))
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()
    expect(screen.getByLabelText('Title')).toHaveValue('Control')
    expect(api.create).toHaveBeenCalledTimes(1)
    resolve(game)
    expect(await screen.findByText('Game administration')).toBeInTheDocument()
  })

  it('loads and updates an existing game', async () => {
    api.get.mockResolvedValue(game)
    api.update.mockResolvedValue({ ...game, title: 'Control Ultimate' })
    renderEditor('/admin/games/game-1/edit')
    expect(screen.getByText('Loading game editor...')).toBeInTheDocument()
    const title = await screen.findByLabelText('Title')
    await userEvent.clear(title)
    await userEvent.type(title, 'Control Ultimate')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(api.update).toHaveBeenCalledWith('game-1', expect.objectContaining({ title: 'Control Ultimate' }), 'token', expect.any(Object))
    expect(await screen.findByText('Game updated.')).toBeInTheDocument()
  })

  it('preserves values for duplicate, validation, and unexpected failures', async () => {
    api.create.mockRejectedValueOnce(new ApiError(409, { detail: 'A game already uses this title and release date.' }))
      .mockRejectedValueOnce(new ApiError(400, { errors: { Title: ['Server title error.'] } }))
      .mockRejectedValueOnce(new Error('offline'))
    renderEditor('/admin/games/new')
    await userEvent.type(screen.getByLabelText('Title'), 'Control')
    await userEvent.type(screen.getByLabelText('Release date'), '2019-08-27')
    const submit = screen.getByRole('button', { name: 'Create game' })
    await userEvent.click(submit)
    expect(await screen.findByText('A game already uses this title and release date.')).toBeInTheDocument()
    await userEvent.click(submit)
    expect((await screen.findAllByText('Server title error.')).length).toBeGreaterThan(0)
    await userEvent.click(submit)
    expect(await screen.findByText('The game could not be saved. Your values are still here.')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('Control')
  })

  it('shows not found without rendering the form', async () => {
    api.get.mockRejectedValue(new ApiError(404))
    renderEditor('/admin/games/missing/edit')
    expect(await screen.findByText('This active game was not found.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
  })
})
