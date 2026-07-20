import { ApiError, request } from './http'

const response = (body: string | null, status = 200) => new Response(body, {
  status,
  headers: body ? { 'Content-Type': 'application/json' } : undefined,
})

describe('request', () => {
  beforeEach(() => vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test'))

  it('returns JSON and supports empty 204 responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response('{"id":"1"}'))
      .mockResolvedValueOnce(response(null, 204))
    await expect(request<{ id: string }>('/api/item')).resolves.toEqual({ id: '1' })
    await expect(request<void>('/api/item', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('rejects malformed successful content', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response('not-json'))
    await expect(request('/api/item')).rejects.toThrow('malformed JSON')
  })

  it('normalizes problem field names', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response(
      '{"title":"Invalid","errors":{"Title":["Required"],"$.Rating":["Invalid"]}}', 400,
    ))
    const error = await request('/api/item').catch((reason: unknown) => reason)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).fieldErrors).toEqual({ title: ['Required'], rating: ['Invalid'] })
  })

  it('forwards cancellation, bearer headers, and protected 401 notification', async () => {
    const onUnauthorized = vi.fn()
    const controller = new AbortController()
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response('{}', 401))
    await expect(request('/api/private', {
      token: 'secret', signal: controller.signal, onUnauthorized,
    })).rejects.toMatchObject({ status: 401 })
    const init = fetchMock.mock.calls[0][1]!
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer secret')
    expect(init.signal).toBe(controller.signal)
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it.each([null, 'not-json'])('invalidates protected 401 content before parsing %s', async (body) => {
    const onUnauthorized = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response(body, 401))
    await expect(request('/api/private', { token: 'secret', onUnauthorized })).rejects.toMatchObject({ status: 401 })
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('rejects malformed successful response shapes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response('{"id":42}'))
    await expect(request('/api/item', {}, (value): value is { id: string } =>
      !!value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string',
    )).rejects.toThrow('unexpected response')
  })
})
