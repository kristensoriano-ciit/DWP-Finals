import { changePassword, getCurrentProfile, login, register, updateProfile } from './authApi'

const user = { id: '1', displayName: 'Ada', email: 'ada@example.test', role: 'Author', isActive: true, createdAtUtc: '', deactivatedAtUtc: null }

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test')
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify(user), { status: 200 }))
})

it('sends registration and login requests', async () => {
  await register({ displayName: 'Ada', email: 'ada@example.test', password: 'password' })
  expect(fetch).toHaveBeenLastCalledWith(new URL('https://api.example.test/api/auth/register'), expect.objectContaining({ method: 'POST', body: JSON.stringify({ displayName: 'Ada', email: 'ada@example.test', password: 'password' }) }))

  vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: 'token', expiresAtUtc: '2099-01-01', user })))
  await login({ email: 'ada@example.test', password: 'password' })
  expect(fetch).toHaveBeenLastCalledWith(new URL('https://api.example.test/api/auth/login'), expect.objectContaining({ method: 'POST' }))
})

it('authenticates current-profile, update, and password requests', async () => {
  const unauthorized = vi.fn()
  await getCurrentProfile('token', unauthorized)
  await updateProfile({ displayName: 'Grace', email: 'grace@example.test' }, 'token', unauthorized)
  vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }))
  await changePassword({ currentPassword: 'old-password', newPassword: 'new-password' }, 'token', unauthorized)

  expect(vi.mocked(fetch).mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual(['/api/account/me', '/api/account/me', '/api/account/password'])
  expect(vi.mocked(fetch).mock.calls.map(([, init]) => init?.method)).toEqual(['GET', 'PUT', 'PUT'])
  expect(vi.mocked(fetch).mock.calls.every(([, init]) => new Headers(init?.headers).get('Authorization') === 'Bearer token')).toBe(true)
})
