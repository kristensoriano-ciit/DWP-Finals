import { request } from './http'
import type { Game, GameReleaseWindow, GameRequest, PagedResponse } from './types'
import { isEmptyResponse, isGame, isPageOf } from './responseValidation'

export type GamesQuery = {
  search?: string
  releaseWindow?: GameReleaseWindow
  page?: number
  pageSize?: number
}

export function listGames(query: GamesQuery = {}, signal?: AbortSignal) {
  const params = new URLSearchParams()
  const search = query.search?.trim()
  if (search) params.set('search', search)
  if (query.releaseWindow && query.releaseWindow !== 'all') params.set('releaseWindow', query.releaseWindow)
  params.set('page', String(Math.max(1, query.page ?? 1)))
  params.set('pageSize', String(Math.min(100, Math.max(1, query.pageSize ?? 20))))
  return request<PagedResponse<Game>>(`/api/games?${params}`, { signal }, isPageOf(isGame))
}

export async function listAllGames(signal?: AbortSignal) {
  const games: Game[] = []
  const maxPages = 100
  for (let page = 1; page <= maxPages; page += 1) {
    const response = await listGames({ page, pageSize: 100 }, signal)
    games.push(...response.items)
    if (games.length >= response.totalCount) return games
    if (!response.items.length) break
  }
  throw new Error('The complete game list could not be loaded.')
}

export function getGame(gameId: string, signal?: AbortSignal) {
  return request<Game>(`/api/games/${encodeURIComponent(gameId)}`, { signal }, isGame)
}

type ProtectedOptions = { signal?: AbortSignal; onUnauthorized?: () => void }

export function createGame(body: GameRequest, token: string, options: ProtectedOptions = {}) {
  return request<Game>('/api/games', { method: 'POST', body, token, ...options }, isGame)
}

export function updateGame(gameId: string, body: GameRequest, token: string, options: ProtectedOptions = {}) {
  return request<Game>(`/api/games/${encodeURIComponent(gameId)}`, { method: 'PUT', body, token, ...options }, isGame)
}

export function archiveGame(gameId: string, token: string, options: ProtectedOptions = {}) {
  return request<void>(`/api/games/${encodeURIComponent(gameId)}`, { method: 'DELETE', token, ...options }, isEmptyResponse)
}
