import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listAllGames } from '../../api/gamesApi'
import { listPublishedRetrospectives } from '../../api/retrospectivesApi'
import type { Game, PagedResponse, PublishedRetrospective, RetrospectiveSort } from '../../api/types'
import { EmptyState, LoadingState, PageError } from '../../components/feedback/Feedback'
import { Pagination } from '../../components/layout/Pagination'
import { RetrospectiveGrid } from '../../components/retrospectives/RetrospectiveGrid'
import { errorMessage, positivePage, updateQuery } from './query'

export function RetrospectivesPage() {
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const gameId = params.get('gameId') ?? ''
  const sort: RetrospectiveSort = params.get('sort') === 'best' ? 'best' : 'newest'
  const page = positivePage(params.get('page'))
  const [games, setGames] = useState<Game[]>([])
  const [gamesError, setGamesError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const requestKey = `${search}|${gameId}|${sort}|${page}|${retryKey}`
  const [response, setResponse] = useState<{ key: string; result: PagedResponse<PublishedRetrospective> | null; error: string }>({ key: '', result: null, error: '' })

  useEffect(() => {
    const controller = new AbortController()
    listAllGames(controller.signal).then(setGames).catch(() => { if (!controller.signal.aborted) setGamesError(true) })
    return () => controller.abort()
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    listPublishedRetrospectives({ search, gameId: gameId || undefined, sort, page, pageSize: 12 }, controller.signal).then((result) => setResponse({ key: requestKey, result, error: '' })).catch((reason: unknown) => { if (!controller.signal.aborted) setResponse({ key: requestKey, result: null, error: errorMessage(reason) }) })
    return () => controller.abort()
  }, [search, gameId, sort, page, retryKey, requestKey])

  function submitSearch(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); setParams(updateQuery(params, { search: String(form.get('search') ?? '').trim(), page: 1 })) }
  function clearQuery() { setParams({}) }
  const loading = response.key !== requestKey
  const { result, error } = response
  return <section className="browse-page"><header className="page-heading"><p className="eyebrow">Stories with hindsight</p><h1>Retrospectives</h1><p>Thoughtful returns to games after the release-day noise has faded.</p></header>{gamesError && <p role="alert">Game filters could not be loaded.</p>}<form className="query-controls" role="search" onSubmit={submitSearch}><label>Search retrospectives<input key={search} name="search" defaultValue={search} /></label><label>Game<select value={gameId} onChange={(event) => setParams(updateQuery(params, { gameId: event.target.value, page: 1 }))}><option value="">All games</option>{games.map((game) => <option key={game.id} value={game.id}>{game.title}</option>)}</select></label><label>Sort<select value={sort} onChange={(event) => setParams(updateQuery(params, { sort: event.target.value, page: 1 }))}><option value="newest">Newest</option><option value="best">Best rated</option></select></label><button type="submit">Search</button></form>{loading ? <LoadingState label="Loading retrospectives..." /> : error ? <PageError message={error} onRetry={() => setRetryKey((key) => key + 1)} /> : result?.items.length ? <><p className="result-count">{result.totalCount} retrospectives</p><RetrospectiveGrid retrospectives={result.items} /><Pagination page={result.page} pageSize={result.pageSize} totalCount={result.totalCount} onPageChange={(value) => setParams(updateQuery(params, { page: value }))} /></> : <EmptyState title="No retrospectives found"><p>Try changing the current query.</p><button onClick={clearQuery}>Clear filters</button></EmptyState>}</section>
}
