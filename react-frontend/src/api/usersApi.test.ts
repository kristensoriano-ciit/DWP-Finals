import { ApiError } from './http'
import { deactivateUser, listUsers } from './usersApi'

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test')
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ items: [], page: 1, pageSize: 20, totalCount: 0 })))
})

it('lists a bounded page with the Admin bearer token', async () => {
  await listUsers({ page: -2, pageSize: 500 }, 'admin-token')

  const [url, init] = vi.mocked(fetch).mock.calls[0]
  expect(String(url)).toBe('https://api.example.test/api/admin/users?page=1&pageSize=100')
  expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer admin-token')
})

it('deactivates an encoded user path and accepts the empty 204 response', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }))

  await expect(deactivateUser('user/id', 'admin-token')).resolves.toBeUndefined()
  const [url, init] = vi.mocked(fetch).mock.calls[0]
  expect(String(url)).toBe('https://api.example.test/api/admin/users/user%2Fid')
  expect(init).toMatchObject({ method: 'DELETE' })
  expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer admin-token')
})

it.each([
  [400, { title: 'Validation failed', errors: { PageSize: ['Page size must be between 1 and 100.'] } }],
  [403, { title: 'Access forbidden', detail: 'Admin access is required.' }],
  [404, { title: 'Account not found' }],
  [409, { title: 'Account conflict', detail: 'Administrators cannot deactivate their own account.' }],
])('preserves Problem Details for status %s', async (status, problem) => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(problem), { status }))

  const operation = status === 400
    ? listUsers({}, 'admin-token')
    : deactivateUser('user-1', 'admin-token')
  const error = await operation.catch((value) => value)

  expect(error).toBeInstanceOf(ApiError)
  expect(error).toMatchObject({ status, problem })
  if (status === 400) expect(error.fieldErrors).toEqual({ pageSize: ['Page size must be between 1 and 100.'] })
})
