import { getPublishedRetrospective, listPublishedRetrospectives } from './retrospectivesApi'

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test')
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"items":[],"page":2,"pageSize":12,"totalCount":0}'))
})

it('serializes public filters and returns the paged response', async () => {
  const result = await listPublishedRetrospectives({ search: ' story ', gameId: 'g-1', sort: 'best', page: 2, pageSize: 12 })
  expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('search=story&gameId=g-1&sort=best&page=2&pageSize=12')
  expect(result.page).toBe(2)
})

it('forwards detail cancellation', async () => {
  const signal = new AbortController().signal
  vi.mocked(fetch).mockResolvedValueOnce(new Response('{"id":"r-1","gameId":"g-1","gameTitle":"Control","authorUserId":"u-1","authorDisplayName":"Ada","title":"Story","reviewContent":"Body","imageUrl":null,"rating":8,"publishedAtUtc":"2026-01-01"}'))
  await getPublishedRetrospective('r-1', signal)
  expect(vi.mocked(fetch).mock.calls[0][1]?.signal).toBe(signal)
})
