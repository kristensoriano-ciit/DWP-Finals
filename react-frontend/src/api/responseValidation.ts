import type { AuthResponse, Game, PagedResponse, PublishedRetrospective, Retrospective, RetrospectiveStatus, User } from './types'

type RecordValue = Record<string, unknown>

function isRecord(value: unknown): value is RecordValue {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isNullableString(value: unknown) { return typeof value === 'string' || value === null }

function isRetrospectiveStatus(value: unknown): value is RetrospectiveStatus {
  return value === 'draft' || value === 'review' || value === 'published' || value === 'unpublished' || value === 'archived'
}

export function isEmptyResponse(value: unknown): value is undefined { return value === undefined }

export function isUser(value: unknown): value is User {
  if (!isRecord(value)) return false
  return typeof value.id === 'string' && typeof value.displayName === 'string' && typeof value.email === 'string'
    && (value.role === 'Author' || value.role === 'Admin') && typeof value.isActive === 'boolean'
    && typeof value.createdAtUtc === 'string' && isNullableString(value.deactivatedAtUtc)
}

export function isAuthResponse(value: unknown): value is AuthResponse {
  return isRecord(value) && typeof value.accessToken === 'string' && typeof value.expiresAtUtc === 'string' && isUser(value.user)
}

export function isGame(value: unknown): value is Game {
  return isRecord(value) && typeof value.id === 'string' && typeof value.title === 'string'
    && isNullableString(value.description) && typeof value.releaseDate === 'string' && isNullableString(value.coverImageUrl)
    && typeof value.isActive === 'boolean' && typeof value.createdAtUtc === 'string' && typeof value.updatedAtUtc === 'string'
    && isNullableString(value.archivedAtUtc)
}

function isRetrospectiveContent(value: unknown): value is RecordValue {
  return isRecord(value) && typeof value.id === 'string' && typeof value.gameId === 'string' && typeof value.gameTitle === 'string'
    && typeof value.authorUserId === 'string' && typeof value.authorDisplayName === 'string' && typeof value.title === 'string'
    && typeof value.reviewContent === 'string' && isNullableString(value.imageUrl) && typeof value.rating === 'number'
}

export function isPublishedRetrospective(value: unknown): value is PublishedRetrospective {
  return isRetrospectiveContent(value) && typeof value.publishedAtUtc === 'string'
}

export function isRetrospective(value: unknown): value is Retrospective {
  if (!isRetrospectiveContent(value)) return false
  const record = value as unknown as RecordValue
  return isRetrospectiveStatus(record.status) && isNullableString(record.unpublishedReason) && typeof record.createdAtUtc === 'string'
    && typeof record.updatedAtUtc === 'string' && isNullableString(record.publishedAtUtc) && isNullableString(record.unpublishedAtUtc)
    && isNullableString(record.archivedAtUtc) && typeof record.rowVersion === 'string'
}

export function isPageOf<T>(itemValidator: (value: unknown) => value is T) {
  return (value: unknown): value is PagedResponse<T> => isRecord(value) && Array.isArray(value.items)
    && value.items.every(itemValidator) && Number.isInteger(value.page) && Number.isInteger(value.pageSize)
    && Number.isInteger(value.totalCount) && Number(value.page) >= 1 && Number(value.pageSize) >= 1 && Number(value.totalCount) >= 0
}
