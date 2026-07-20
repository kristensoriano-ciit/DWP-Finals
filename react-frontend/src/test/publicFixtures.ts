import type { Game, PagedResponse, PublishedRetrospective } from '../api/types'

export const game: Game = {
  id: 'game-1', title: 'Control', description: 'A shifting place of power.', releaseDate: '2019-08-27', coverImageUrl: null,
  isActive: true, createdAtUtc: '2026-01-01T00:00:00Z', updatedAtUtc: '2026-01-01T00:00:00Z', archivedAtUtc: null,
}

export const retrospective: PublishedRetrospective = {
  id: 'retro-1', gameId: game.id, gameTitle: game.title, authorUserId: 'user-1', authorDisplayName: 'Ada',
  title: 'The Oldest House still shifts', reviewContent: 'A thoughtful return to a strange building.\n\nIt remains unforgettable.',
  imageUrl: null, rating: 9, publishedAtUtc: '2026-07-01T00:00:00Z',
}

export function pageOf<T>(items: T[], page = 1, pageSize = 12): PagedResponse<T> {
  return { items, page, pageSize, totalCount: items.length }
}
