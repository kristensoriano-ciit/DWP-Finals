import type { Retrospective } from '../api/types'

export const ownedRetrospective: Retrospective = {
  id: 'retro-1', gameId: 'game-1', gameTitle: 'Control', authorUserId: 'user-1', authorDisplayName: 'Ada',
  title: 'The Oldest House still shifts', reviewContent: 'A careful second look.', imageUrl: null, rating: 9,
  status: 'draft', unpublishedReason: null, createdAtUtc: '2026-07-01T00:00:00Z', updatedAtUtc: '2026-07-01T00:00:00Z',
  publishedAtUtc: null, unpublishedAtUtc: null, archivedAtUtc: null, rowVersion: 'AAAAAQ==',
}
