import type { AuthorRetrospectiveStatus } from '../api/types'

export type RetrospectiveDraft = {
  gameId: string
  title: string
  reviewContent: string
  imageUrl: string
  rating: number
  status: AuthorRetrospectiveStatus
  unpublishedReason: string
}

type StoredDraft = RetrospectiveDraft & { retrospectiveId: string; userId: string; savedAtUtc: string }
const MAX_AGE_MS = 24 * 60 * 60 * 1000

function isDraft(value: unknown, resourceId: string, userId: string): value is StoredDraft {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  const statuses = ['draft', 'review', 'published', 'unpublished']
  const savedAt = typeof record.savedAtUtc === 'string' ? Date.parse(record.savedAtUtc) : Number.NaN
  return record.retrospectiveId === resourceId && record.userId === userId && typeof record.gameId === 'string' && typeof record.title === 'string' && record.title.length <= 200
    && typeof record.reviewContent === 'string' && record.reviewContent.length <= 20_000 && typeof record.imageUrl === 'string' && record.imageUrl.length <= 2_048
    && Number.isInteger(record.rating) && Number(record.rating) >= 1 && Number(record.rating) <= 10
    && typeof record.status === 'string' && statuses.includes(record.status) && typeof record.unpublishedReason === 'string' && record.unpublishedReason.length <= 500
    && Number.isFinite(savedAt) && savedAt <= Date.now() + 60_000 && Date.now() - savedAt <= MAX_AGE_MS
}

export function useSessionDraft(resourceId: string, userId: string) {
  const key = `checkpoint:retrospective-draft:${userId}:${resourceId}`
  function discard() { sessionStorage.removeItem(key) }
  function save(draft: RetrospectiveDraft) {
    sessionStorage.setItem(key, JSON.stringify({ ...draft, retrospectiveId: resourceId, userId, savedAtUtc: new Date().toISOString() }))
  }
  function restore(): RetrospectiveDraft | null {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    try {
      const value: unknown = JSON.parse(raw)
      if (!value || typeof value !== 'object' || (value as { userId?: unknown }).userId !== userId) return null
      discard()
      if (!isDraft(value, resourceId, userId)) return null
      return {
        gameId: value.gameId, title: value.title, reviewContent: value.reviewContent,
        imageUrl: value.imageUrl, rating: value.rating, status: value.status,
        unpublishedReason: value.unpublishedReason,
      }
    } catch { discard(); return null }
  }
  return { save, restore, discard }
}
