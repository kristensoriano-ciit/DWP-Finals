import { request } from './http'
import type { AuthorRetrospectiveStatus, ChangeRetrospectiveStatusRequest, CreateRetrospectiveRequest, PagedResponse, PublishedRetrospective, Retrospective, RetrospectiveSort, UpdateRetrospectiveRequest } from './types'
import { isEmptyResponse, isPageOf, isPublishedRetrospective, isRetrospective } from './responseValidation'

export type RetrospectivesQuery = {
  search?: string
  gameId?: string
  sort?: RetrospectiveSort
  page?: number
  pageSize?: number
}

export function listPublishedRetrospectives(query: RetrospectivesQuery = {}, signal?: AbortSignal) {
  const params = new URLSearchParams()
  const search = query.search?.trim()
  if (search) params.set('search', search)
  if (query.gameId) params.set('gameId', query.gameId)
  if (query.sort && query.sort !== 'newest') params.set('sort', query.sort)
  params.set('page', String(Math.max(1, query.page ?? 1)))
  params.set('pageSize', String(Math.min(100, Math.max(1, query.pageSize ?? 20))))
  return request<PagedResponse<PublishedRetrospective>>(`/api/retrospectives?${params}`, { signal }, isPageOf(isPublishedRetrospective))
}

export function getPublishedRetrospective(retrospectiveId: string, signal?: AbortSignal) {
  return request<PublishedRetrospective>(`/api/retrospectives/${encodeURIComponent(retrospectiveId)}`, { signal }, isPublishedRetrospective)
}

export type OwnRetrospectivesQuery = RetrospectivesQuery & { status?: AuthorRetrospectiveStatus }
type ProtectedOptions = { signal?: AbortSignal; onUnauthorized?: () => void }

export function listOwnRetrospectives(query: OwnRetrospectivesQuery = {}, token: string, options: ProtectedOptions = {}) {
  const params = new URLSearchParams()
  const search = query.search?.trim()
  if (search) params.set('search', search)
  if (query.gameId) params.set('gameId', query.gameId)
  if (query.status) params.set('status', query.status)
  if (query.sort && query.sort !== 'newest') params.set('sort', query.sort)
  params.set('page', String(Math.max(1, query.page ?? 1)))
  params.set('pageSize', String(Math.min(100, Math.max(1, query.pageSize ?? 20))))
  return request<PagedResponse<Retrospective>>(`/api/account/retrospectives?${params}`, { token, ...options }, isPageOf(isRetrospective))
}

export function getOwnRetrospective(retrospectiveId: string, token: string, options: ProtectedOptions = {}) {
  return request<Retrospective>(`/api/account/retrospectives/${encodeURIComponent(retrospectiveId)}`, { token, ...options }, isRetrospective)
}

export function createRetrospective(body: CreateRetrospectiveRequest, token: string, options: ProtectedOptions = {}) {
  return request<Retrospective>('/api/retrospectives', { method: 'POST', body, token, ...options }, isRetrospective)
}

export function updateRetrospective(retrospectiveId: string, body: UpdateRetrospectiveRequest, token: string, options: ProtectedOptions = {}) {
  return request<Retrospective>(`/api/retrospectives/${encodeURIComponent(retrospectiveId)}`, { method: 'PUT', body, token, ...options }, isRetrospective)
}

export function changeRetrospectiveStatus(retrospectiveId: string, body: ChangeRetrospectiveStatusRequest, token: string, options: ProtectedOptions = {}) {
  return request<Retrospective>(`/api/retrospectives/${encodeURIComponent(retrospectiveId)}/status`, { method: 'PUT', body, token, ...options }, isRetrospective)
}

export function archiveRetrospective(retrospectiveId: string, rowVersion: string, token: string, options: ProtectedOptions = {}) {
  return request<void>(`/api/retrospectives/${encodeURIComponent(retrospectiveId)}`, { method: 'DELETE', token, headers: { 'If-Match': rowVersion }, ...options }, isEmptyResponse)
}
