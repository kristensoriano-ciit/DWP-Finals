import { getGame, listAllGames, listGames } from './gamesApi'

const game = (id: string, title = 'Control') => ({ id, title, description: null, releaseDate: '2020-01-01', coverImageUrl: null, isActive: true, createdAtUtc: '', updatedAtUtc: '', archivedAtUtc: null })

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test')
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"items":[],"page":1,"pageSize":20,"totalCount":0}'))
})

it('serializes bounded game queries and forwards cancellation', async () => {
  const signal = new AbortController().signal
  await listGames({ search: '  control ', releaseWindow: 'new', page: -4, pageSize: 400 }, signal)
  const [url, init] = vi.mocked(fetch).mock.calls[0]
  expect(String(url)).toBe('https://api.example.test/api/games?search=control&releaseWindow=new&page=1&pageSize=100')
  expect(init?.signal).toBe(signal)
})

it('requests an encoded game detail path', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(game('game'))))
  await getGame('game/id')
  expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('/api/games/game%2Fid')
})

it('loads every game option across bounded pages', async () => {
  const first = Array.from({ length: 100 }, (_, index) => game(`game-${index}`, `Game ${index}`))
  vi.mocked(fetch)
    .mockResolvedValueOnce(new Response(JSON.stringify({ items: first, page: 1, pageSize: 100, totalCount: 101 })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ items: [game('game-100', 'Last game')], page: 2, pageSize: 100, totalCount: 101 })))
  await expect(listAllGames()).resolves.toHaveLength(101)
  expect(vi.mocked(fetch).mock.calls[1][0].toString()).toContain('page=2')
})

it('rejects a malformed successful page payload', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response('{"items":"not-an-array","page":1,"pageSize":20,"totalCount":0}'))
  await expect(listGames()).rejects.toThrow('unexpected response')
})
