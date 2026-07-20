import type { RetrospectiveDraft } from '../../hooks/useSessionDraft'

export function emptyRetrospectiveDraft(): RetrospectiveDraft {
  return { gameId: '', title: '', reviewContent: '', imageUrl: '', rating: 5, status: 'draft', unpublishedReason: '' }
}

export function validateRetrospectiveDraft(draft: RetrospectiveDraft) {
  const errors: Record<string, string[]> = {}
  if (!draft.gameId) errors.gameId = ['Choose a game.']
  const title = draft.title.trim()
  if (!title) errors.title = ['Enter a title.']
  else if (title.length > 200) errors.title = ['Title must be 200 characters or fewer.']
  const content = draft.reviewContent.trim()
  if (!content) errors.reviewContent = ['Enter your retrospective.']
  else if (content.length > 20_000) errors.reviewContent = ['Retrospective must be 20,000 characters or fewer.']
  if (!Number.isInteger(draft.rating) || draft.rating < 1 || draft.rating > 10) errors.rating = ['Rating must be from 1 to 10.']
  if (draft.imageUrl.trim()) {
    try { if (new URL(draft.imageUrl.trim()).protocol !== 'https:') errors.imageUrl = ['Use an HTTPS image URL.'] }
    catch { errors.imageUrl = ['Enter a valid HTTPS image URL.'] }
  }
  if (draft.status === 'unpublished' && !draft.unpublishedReason.trim()) errors.unpublishedReason = ['Enter a reason for unpublishing.']
  else if (draft.unpublishedReason.trim().length > 500) errors.unpublishedReason = ['Reason must be 500 characters or fewer.']
  return errors
}
