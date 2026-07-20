import { request } from './http'
import type { PagedResponse, User } from './types'
import { isEmptyResponse, isPageOf, isUser } from './responseValidation'

export type UsersQuery = {
  page?: number
  pageSize?: number
}

type ProtectedOptions = { signal?: AbortSignal; onUnauthorized?: () => void }

export function listUsers(query: UsersQuery = {}, token: string, options: ProtectedOptions = {}) {
  const params = new URLSearchParams({
    page: String(Math.max(1, query.page ?? 1)),
    pageSize: String(Math.min(100, Math.max(1, query.pageSize ?? 20))),
  })
  return request<PagedResponse<User>>(`/api/admin/users?${params}`, { token, ...options }, isPageOf(isUser))
}

export function deactivateUser(userId: string, token: string, options: ProtectedOptions = {}) {
  return request<void>(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    token,
    ...options,
  }, isEmptyResponse)
}
