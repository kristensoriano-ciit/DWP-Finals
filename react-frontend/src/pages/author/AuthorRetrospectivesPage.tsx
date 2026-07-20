import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listAllGames } from '../../api/gamesApi'
import { listOwnRetrospectives } from '../../api/retrospectivesApi'
import type { AuthorRetrospectiveStatus, Game, PagedResponse, Retrospective, RetrospectiveSort } from '../../api/types'
import { useSession } from '../../auth/useSession'
import { EmptyState, LoadingState, PageError } from '../../components/feedback/Feedback'
import { Pagination } from '../../components/layout/Pagination'
import { positivePage, updateQuery } from '../public/query'

const statuses: AuthorRetrospectiveStatus[] = ['draft', 'review', 'published', 'unpublished']
const statusLabels: Record<AuthorRetrospectiveStatus, string> = { draft: 'Draft', review: 'Review', published: 'Published', unpublished: 'Unpublished' }

export function AuthorRetrospectivesPage() {
  const session = useSession()
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const gameId = params.get('gameId') ?? ''
  const rawStatus = params.get('status')
  const status = statuses.includes(rawStatus as AuthorRetrospectiveStatus) ? rawStatus as AuthorRetrospectiveStatus : undefined
  const sort: RetrospectiveSort = params.get('sort') === 'best' ? 'best' : 'newest'
  const page = positivePage(params.get('page'))
  const [games, setGames] = useState<Game[]>([])
  const [gamesError, setGamesError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const requestKey = `${search}|${gameId}|${status}|${sort}|${page}|${retryKey}`
  const [response, setResponse] = useState<{ key: string; result: PagedResponse<Retrospective> | null; error: boolean }>({ key: '', result: null, error: false })

  useEffect(() => {
    const controller = new AbortController()
    listAllGames(controller.signal).then(setGames).catch(() => { if (!controller.signal.aborted) setGamesError(true) })
    return () => controller.abort()
  }, [])
  useEffect(() => {
    if (!session.token) return
    const controller = new AbortController()
    listOwnRetrospectives({ search, gameId: gameId || undefined, status, sort, page, pageSize: 12 }, session.token, { signal: controller.signal, onUnauthorized: session.onUnauthorized })
      .then((result) => setResponse({ key: requestKey, result, error: false }))
      .catch(() => { if (!controller.signal.aborted) setResponse({ key: requestKey, result: null, error: true }) })
    return () => controller.abort()
  }, [search, gameId, status, sort, page, retryKey, requestKey, session.token, session.onUnauthorized])

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setParams(updateQuery(params, { search: String(new FormData(event.currentTarget).get('search') ?? '').trim(), page: 1 }))
  }
  const loading = response.key !== requestKey
  return <section className="author-dashboard"><header className="page-heading page-heading--actions"><div><p className="eyebrow">Author workspace</p><h1>My Retrospectives</h1><p>Draft, refine, publish, or revisit your work.</p></div><Link className="button-link" to="/dashboard/retrospectives/new">New retrospective</Link></header>
    {gamesError && <p role="alert">Game filters could not be loaded.</p>}<form className="query-controls" role="search" onSubmit={submitSearch}><label>Search your retrospectives<input key={search} name="search" defaultValue={search} /></label><label>Game<select value={gameId} onChange={(event) => setParams(updateQuery(params, { gameId: event.target.value, page: 1 }))}><option value="">All games</option>{games.map((game) => <option value={game.id} key={game.id}>{game.title}</option>)}</select></label><label>Status<select value={status ?? ''} onChange={(event) => setParams(updateQuery(params, { status: event.target.value, page: 1 }))}><option value="">All statuses</option>{statuses.map((value) => <option value={value} key={value}>{statusLabels[value]}</option>)}</select></label><label>Sort<select value={sort} onChange={(event) => setParams(updateQuery(params, { sort: event.target.value, page: 1 }))}><option value="newest">Newest</option><option value="best">Best rated</option></select></label><button type="submit">Search</button></form>
    {loading ? <LoadingState label="Loading your retrospectives..." /> : response.error ? <PageError message="Your retrospectives could not be loaded." onRetry={() => setRetryKey((value) => value + 1)} /> : response.result?.items.length ? <><div className="owner-list">{response.result.items.map((item) => <article className="owner-row" key={item.id}><div><p className="owner-row__game">{item.gameTitle}</p><h2>{item.title}</h2><p>Updated <time dateTime={item.updatedAtUtc}>{new Date(item.updatedAtUtc).toLocaleDateString()}</time></p></div><div className="owner-row__meta"><span className={`status status--${item.status}`}>{statusLabels[item.status as AuthorRetrospectiveStatus]}</span><span>{item.rating}/10</span><Link to={`/dashboard/retrospectives/${item.id}/edit`} aria-label={`Edit ${item.title}`}>Edit</Link></div></article>)}</div><Pagination page={response.result.page} pageSize={response.result.pageSize} totalCount={response.result.totalCount} onPageChange={(value) => setParams(updateQuery(params, { page: value }))} /></> : <EmptyState title="No retrospectives found"><p>Start a new retrospective or change the current filters.</p><Link to="/dashboard/retrospectives/new">Create your first retrospective</Link></EmptyState>}
  </section>
}
