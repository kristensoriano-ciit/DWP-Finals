import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listGames } from '../../api/gamesApi'
import type { GameReleaseWindow, PagedResponse, Game } from '../../api/types'
import { EmptyState, LoadingState, PageError } from '../../components/feedback/Feedback'
import { GameGrid } from '../../components/games/GameGrid'
import { Pagination } from '../../components/layout/Pagination'
import { errorMessage, positivePage, updateQuery } from './query'

const PAGE_SIZE = 12

export function GamesPage() {
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const releaseParam = params.get('releaseWindow')
  const releaseWindow: GameReleaseWindow = releaseParam === 'new' || releaseParam === 'upcoming' ? releaseParam : 'all'
  const page = positivePage(params.get('page'))
  const [retryKey, setRetryKey] = useState(0)
  const requestKey = `${search}|${releaseWindow}|${page}|${retryKey}`
  const [response, setResponse] = useState<{ key: string; result: PagedResponse<Game> | null; error: string }>({ key: '', result: null, error: '' })

  useEffect(() => {
    const controller = new AbortController()
    listGames({ search, releaseWindow, page, pageSize: PAGE_SIZE }, controller.signal)
      .then((result) => setResponse({ key: requestKey, result, error: '' }))
      .catch((reason: unknown) => { if (!controller.signal.aborted) setResponse({ key: requestKey, result: null, error: errorMessage(reason) }) })
    return () => controller.abort()
  }, [search, releaseWindow, page, retryKey, requestKey])

  function submitSearch(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); setParams(updateQuery(params, { search: String(form.get('search') ?? '').trim(), page: 1 })) }
  function clearQuery() { setParams({}) }
  const loading = response.key !== requestKey
  const { result, error } = response

  return <section className="browse-page"><header className="page-heading"><p className="eyebrow">The catalog</p><h1>Games</h1><p>Explore active games remembered by Checkpoint Authors.</p></header>
    <form className="query-controls" role="search" onSubmit={submitSearch}><label>Search games<input key={search} name="search" defaultValue={search} /></label><label>Release window<select value={releaseWindow} onChange={(event) => setParams(updateQuery(params, { releaseWindow: event.target.value, page: 1 }))}><option value="all">All releases</option><option value="new">New releases</option><option value="upcoming">Upcoming</option></select></label><button type="submit">Search</button></form>
    {loading ? <LoadingState label="Loading games..." /> : error ? <PageError message={error} onRetry={() => setRetryKey((key) => key + 1)} /> : result && result.items.length ? <><p className="result-count">{result.totalCount} games</p><GameGrid games={result.items} /><Pagination page={result.page} pageSize={result.pageSize} totalCount={result.totalCount} onPageChange={(value) => setParams(updateQuery(params, { page: value }))} /></> : <EmptyState title="No games found"><p>Try a different search or release window.</p><button onClick={clearQuery}>Clear filters</button></EmptyState>}
  </section>
}
