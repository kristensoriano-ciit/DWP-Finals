import { beforeEach, describe, expect, it, vi } from 'vitest'
import { archiveRetrospective, changeRetrospectiveStatus, createRetrospective, getOwnRetrospective, listOwnRetrospectives, updateRetrospective } from './retrospectivesApi'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)
const retrospective = { id: 'retro-1', gameId: 'game-1', gameTitle: 'Control', authorUserId: 'user-1', authorDisplayName: 'Ada', title: 'Title', reviewContent: 'Body', imageUrl: null, rating: 8, status: 'draft', unpublishedReason: null, createdAtUtc: '', updatedAtUtc: '', publishedAtUtc: null, unpublishedAtUtc: null, archivedAtUtc: null, rowVersion: 'v1' }

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test')
  fetchMock.mockReset().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(retrospective), { status: 200, headers: { 'Content-Type': 'application/json' } })))
})

describe('owner retrospective requests', () => {
  it('serializes bounded owner filters and authenticates list/detail', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ items: [], page: 1, pageSize: 100, totalCount: 0 })))
    await listOwnRetrospectives({ search: '  house ', gameId: 'game/1', status: 'review', sort: 'best', page: 0, pageSize: 500 }, 'token')
    await getOwnRetrospective('retro/1', 'token')
    expect(fetchMock.mock.calls[0][0].toString()).toContain('/api/account/retrospectives?search=house&gameId=game%2F1&status=review&sort=best&page=1&pageSize=100')
    expect(fetchMock.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer token')
    expect(fetchMock.mock.calls[1][0].pathname).toBe('/api/account/retrospectives/retro%2F1')
  })

  it('sends create, update, status, and archive concurrency values', async () => {
    const draft = { gameId: 'game-1', title: 'Title', reviewContent: 'Body', imageUrl: null, rating: 8 }
    await createRetrospective({ ...draft, status: 'published' }, 'token')
    await updateRetrospective('retro-1', { ...draft, rowVersion: 'v1' }, 'token')
    await changeRetrospectiveStatus('retro-1', { status: 'unpublished', unpublishedReason: 'Needs work', rowVersion: 'v2' }, 'token')
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    await archiveRetrospective('retro-1', 'v3', 'token')
    expect(fetchMock.mock.calls.map((call) => call[1].method)).toEqual(['POST', 'PUT', 'PUT', 'DELETE'])
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ rowVersion: 'v1' })
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toMatchObject({ rowVersion: 'v2', unpublishedReason: 'Needs work' })
    expect(fetchMock.mock.calls[3][1].headers.get('If-Match')).toBe('v3')
  })
})
