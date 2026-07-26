import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listAllGames } from '../../api/gamesApi'
import { listOwnRetrospectives } from '../../api/retrospectivesApi'
import type { AuthorRetrospectiveStatus, Game, PagedResponse, Retrospective, RetrospectiveSort, RetrospectiveStatus } from '../../api/types'
import { useSession } from '../../auth/useSession'
import { DashboardPanels } from '../../components/dashboard/DashboardPanels'
import { EmptyState, LoadingState, PageError } from '../../components/feedback/Feedback'
import { Pagination } from '../../components/layout/Pagination'
import { positivePage, updateQuery } from '../public/query'

const statuses: AuthorRetrospectiveStatus[] = ['draft', 'review', 'published', 'unpublished']
const statusLabels: Record<RetrospectiveStatus, string> = { draft: 'Draft', review: 'Review', published: 'Published', unpublished: 'Unpublished', archived: 'Archived' }

function UnpublishedRetrospectivesTable({ items }: { items: Retrospective[] }) {
  return <div className="owner-table-scroll"><table className="owner-table"><thead><tr><th scope="col">Game</th><th scope="col">Retrospective</th><th scope="col">Status</th><th scope="col">Reason</th><th scope="col">Updated</th><th scope="col">Rating</th><th scope="col">Actions</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.gameTitle}</td><th scope="row">{item.title}</th><td><span className="status status--unpublished">Unpublished</span></td><td>{item.unpublishedReason ?? 'No reason recorded'}</td><td><time dateTime={item.updatedAtUtc}>{new Date(item.updatedAtUtc).toLocaleDateString()}</time></td><td>{item.rating}/10</td><td><Link to={`/dashboard/retrospectives/${item.id}/edit`} aria-label={`Edit ${item.title}`}>Edit</Link></td></tr>)}</tbody></table></div>
}

function RetrospectiveCards({ items }: { items: Retrospective[] }) {
  return <div className="owner-list">{items.map((item) => <article className="owner-row" key={item.id}><div><p className="owner-row__game">{item.gameTitle}</p><h2>{item.title}</h2><p>Updated <time dateTime={item.updatedAtUtc}>{new Date(item.updatedAtUtc).toLocaleDateString()}</time></p></div><div className="owner-row__meta"><span className={`status status--${item.status}`}>{statusLabels[item.status]}</span><span>{item.rating}/10</span><Link to={`/dashboard/retrospectives/${item.id}/edit`} aria-label={`Edit ${item.title}`}>Edit</Link></div></article>)}</div>
}

export function AuthorRetrospectivesPage({ fixedStatus }: { fixedStatus?: AuthorRetrospectiveStatus }) {
  const session = useSession()
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const gameId = params.get('gameId') ?? ''
  const rawStatus = params.get('status')
  const status = fixedStatus ?? (statuses.includes(rawStatus as AuthorRetrospectiveStatus) ? rawStatus as AuthorRetrospectiveStatus : undefined)
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
  const isUnpublishedView = fixedStatus === 'unpublished'
  return <section className="author-dashboard"><header className="page-heading page-heading--actions"><div><p className="eyebrow">Author workspace</p><h1>{isUnpublishedView ? 'Unpublished Retrospectives' : 'My Retrospectives'}</h1><p>{isUnpublishedView ? 'Review the reason each retrospective was unpublished.' : 'Draft, refine, publish, or revisit your work.'}</p></div><div className="page-heading__links">{isUnpublishedView ? <Link to="/dashboard/retrospectives">Back to all retrospectives</Link> : <Link to="/dashboard/retrospectives/unpublished">View unpublished</Link>}<Link className="button-link" to="/dashboard/retrospectives/new">New retrospective</Link></div></header>
    {gamesError && <p role="alert">Game filters could not be loaded.</p>}<form className="query-controls" role="search" onSubmit={submitSearch}><label>Search your retrospectives<input key={search} name="search" defaultValue={search} /></label><label>Game<select value={gameId} onChange={(event) => setParams(updateQuery(params, { gameId: event.target.value, page: 1 }))}><option value="">All games</option>{games.map((game) => <option value={game.id} key={game.id}>{game.title}</option>)}</select></label>{!fixedStatus && <label>Status<select value={status ?? ''} onChange={(event) => setParams(updateQuery(params, { status: event.target.value, page: 1 }))}><option value="">All statuses</option>{statuses.map((value) => <option value={value} key={value}>{statusLabels[value]}</option>)}</select></label>}<label>Sort<select value={sort} onChange={(event) => setParams(updateQuery(params, { sort: event.target.value, page: 1 }))}><option value="newest">Newest</option><option value="best">Best rated</option></select></label><button type="submit">Search</button></form>
    {loading ? <LoadingState label="Loading your retrospectives..." /> : response.error ? <PageError message="Your retrospectives could not be loaded." onRetry={() => setRetryKey((value) => value + 1)} /> : response.result?.items.length ? <>{isUnpublishedView ? <UnpublishedRetrospectivesTable items={response.result.items} /> : <RetrospectiveCards items={response.result.items} />}<Pagination page={response.result.page} pageSize={response.result.pageSize} totalCount={response.result.totalCount} onPageChange={(value) => setParams(updateQuery(params, { page: value }))} /></> : <EmptyState title={isUnpublishedView ? 'No unpublished retrospectives' : 'No retrospectives found'}><p>{isUnpublishedView ? 'Your unpublished retrospectives will appear here.' : 'Start a new retrospective or change the current filters.'}</p>{!isUnpublishedView && <Link to="/dashboard/retrospectives/new">Create your first retrospective</Link>}</EmptyState>}
    <DashboardPanels />
  </section>
}
