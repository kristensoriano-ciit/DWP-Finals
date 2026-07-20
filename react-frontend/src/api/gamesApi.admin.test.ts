import { ApiError } from './http'
import { archiveGame, createGame, updateGame } from './gamesApi'
import type { GameRequest } from './types'

const body: GameRequest = {
  title: 'Control',
  description: 'A shifting place of power.',
  releaseDate: '2019-08-27',
  coverImageUrl: 'https://images.example.test/control.jpg',
}
const game = { id: 'game-1', ...body, isActive: true, createdAtUtc: '', updatedAtUtc: '', archivedAtUtc: null }

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test')
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(game), { status: 200 }))
})

it('creates a game with the Admin bearer token and request body', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(game), { status: 201 }))
  await createGame(body, 'admin-token')
  const [url, init] = vi.mocked(fetch).mock.calls[0]
  expect(String(url)).toBe('https://api.example.test/api/games')
  expect(init).toMatchObject({ method: 'POST', body: JSON.stringify(body) })
  expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer admin-token')
})

it('updates an encoded game path and returns the game', async () => {
  const result = await updateGame('game/id', body, 'admin-token')
  const [url, init] = vi.mocked(fetch).mock.calls[0]
  expect(String(url)).toBe('https://api.example.test/api/games/game%2Fid')
  expect(init).toMatchObject({ method: 'PUT', body: JSON.stringify(body) })
  expect(result).toEqual(game)
})

it('archives a game and accepts the empty 204 response', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }))
  await expect(archiveGame('game-1', 'admin-token')).resolves.toBeUndefined()
  expect(vi.mocked(fetch).mock.calls[0][1]).toMatchObject({ method: 'DELETE' })
})

it.each([
  [400, { title: 'Validation failed', errors: { Title: ['Title is required.'] } }],
  [403, { title: 'Forbidden' }],
  [409, { detail: 'A game already uses this title and release date.' }],
])('preserves typed API errors for status %s', async (status, problem) => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(problem), { status }))
  const error = await createGame(body, 'admin-token').catch((value) => value)
  expect(error).toBeInstanceOf(ApiError)
  expect(error).toMatchObject({ status })
  if (status === 400) expect(error.fieldErrors).toEqual({ title: ['Title is required.'] })
})
