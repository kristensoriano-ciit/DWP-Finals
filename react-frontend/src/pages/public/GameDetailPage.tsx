import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getGame } from '../../api/gamesApi'
import { ApiError } from '../../api/http'
import { listPublishedRetrospectives } from '../../api/retrospectivesApi'
import type { Game, PagedResponse, PublishedRetrospective } from '../../api/types'
import { EmptyState, LoadingState, PageError } from '../../components/feedback/Feedback'
import { ContentImage } from '../../components/layout/ContentImage'
import { Pagination } from '../../components/layout/Pagination'
import { RetrospectiveGrid } from '../../components/retrospectives/RetrospectiveGrid'
import { errorMessage, positivePage, updateQuery } from './query'

export function GameDetailPage() {
  const { gameId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const page = positivePage(params.get('page'))
  const requestKey = `${gameId}|${page}`
  const [response, setResponse] = useState<{ key: string; game: Game | null; related: PagedResponse<PublishedRetrospective> | null; gameError: unknown; relatedError: string }>({ key: '', game: null, related: null, gameError: null, relatedError: '' })

  useEffect(() => {
    const controller = new AbortController()
    Promise.allSettled([getGame(gameId, controller.signal), listPublishedRetrospectives({ gameId, page, pageSize: 9 }, controller.signal)]).then(([gameResponse, relatedResponse]) => {
      if (controller.signal.aborted) return
      setResponse({ key: requestKey, game: gameResponse.status === 'fulfilled' ? gameResponse.value : null, related: relatedResponse.status === 'fulfilled' ? relatedResponse.value : null, gameError: gameResponse.status === 'rejected' ? gameResponse.reason : null, relatedError: relatedResponse.status === 'rejected' ? errorMessage(relatedResponse.reason) : '' })
    })
    return () => controller.abort()
  }, [gameId, page, requestKey])

  if (response.key !== requestKey) return <LoadingState label="Loading game..." />
  const { game, related, gameError, relatedError } = response
  if (gameError instanceof ApiError && gameError.status === 404) return <section className="page-message"><h1>Game not found</h1><p>This game is unavailable or archived.</p><Link to="/games">Browse games</Link></section>
  if (gameError || !game) return <PageError message={errorMessage(gameError)} />
  return <article className="detail-page"><header className="game-detail"><ContentImage src={game.coverImageUrl} alt={`${game.title} cover`} /><div><p className="eyebrow">Game retrospective archive</p><h1>{game.title}</h1><time dateTime={game.releaseDate}>Released {new Date(`${game.releaseDate}T00:00:00`).toLocaleDateString()}</time>{game.description && <p>{game.description}</p>}</div></header><section className="related" aria-labelledby="related-title"><div className="section-heading"><div><p className="eyebrow">Looking back</p><h2 id="related-title">Retrospectives</h2></div></div>{relatedError ? <PageError message={relatedError} /> : related?.items.length ? <><RetrospectiveGrid retrospectives={related.items} /><Pagination page={related.page} pageSize={related.pageSize} totalCount={related.totalCount} onPageChange={(value) => setParams(updateQuery(params, { page: value }))} /></> : <EmptyState title="No retrospectives for this game"><p>Authors have not published a story for it yet.</p></EmptyState>}</section></article>
}
