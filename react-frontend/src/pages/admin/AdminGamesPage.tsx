import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { archiveGame, listGames } from '../../api/gamesApi'
import { ApiError } from '../../api/http'
import type { Game, GameReleaseWindow, PagedResponse } from '../../api/types'
import { useSession } from '../../auth/useSession'
import { EmptyState, LoadingState, PageError } from '../../components/feedback/Feedback'
import { ConfirmDialog } from '../../components/forms/ConfirmDialog'
import { Pagination } from '../../components/layout/Pagination'
import { positivePage, updateQuery } from '../public/query'

const releaseWindows: GameReleaseWindow[] = ['all', 'new', 'upcoming']

export function AdminGamesPage() {
  const session = useSession()
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const rawReleaseWindow = params.get('releaseWindow')
  const releaseWindow = releaseWindows.includes(rawReleaseWindow as GameReleaseWindow) ? rawReleaseWindow as GameReleaseWindow : 'all'
  const page = positivePage(params.get('page'))
  const [retryKey, setRetryKey] = useState(0)
  const requestKey = `${search}|${releaseWindow}|${page}|${retryKey}`
  const [response, setResponse] = useState<{ key: string; result: PagedResponse<Game> | null; error: unknown }>({ key: '', result: null, error: null })
  const [selected, setSelected] = useState<Game | null>(null)
  const [archivePending, setArchivePending] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    listGames({ search, releaseWindow, page, pageSize: 12 }, controller.signal)
      .then((result) => setResponse({ key: requestKey, result, error: null }))
      .catch((error: unknown) => { if (!controller.signal.aborted) setResponse({ key: requestKey, result: null, error }) })
    return () => controller.abort()
  }, [search, releaseWindow, page, retryKey, requestKey])

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setParams(updateQuery(params, { search: String(new FormData(event.currentTarget).get('search') ?? '').trim(), page: 1 }))
  }
  async function confirmArchive() {
    if (!selected || !session.token || archivePending) return
    setArchivePending(true)
    try {
      await archiveGame(selected.id, session.token, { onUnauthorized: session.onUnauthorized })
      setResponse((current) => current.result ? { ...current, result: { ...current.result, items: current.result.items.filter((item) => item.id !== selected.id), totalCount: Math.max(0, current.result.totalCount - 1) } } : current)
      setNotice(`${selected.title} was archived and removed from public browsing and Author selection. Published retrospectives retain its attribution.`)
      setSelected(null)
    } catch (error) {
      setNotice(error instanceof ApiError && error.status === 403 ? 'You do not have permission to archive games.' : 'The game could not be archived. Try again.')
    } finally { setArchivePending(false) }
  }

  const loading = response.key !== requestKey
  const forbidden = response.error instanceof ApiError && response.error.status === 403
  return <section className="admin-games"><header className="page-heading page-heading--actions"><div><p className="eyebrow">Administration</p><h1>Games</h1><p>Maintain the active catalog available to readers and Authors.</p></div><Link className="button-link" to="/admin/games/new">New game</Link></header>
    <form className="query-controls" role="search" onSubmit={submitSearch}><label>Search games<input key={search} name="search" defaultValue={search} /></label><label>Release window<select value={releaseWindow} onChange={(event) => setParams(updateQuery(params, { releaseWindow: event.target.value, page: 1 }))}><option value="all">All releases</option><option value="new">New releases</option><option value="upcoming">Upcoming</option></select></label><button type="submit">Search</button></form>
    {notice && <p className="notice" role="status">{notice}</p>}
    {loading ? <LoadingState label="Loading games for administration..." /> : forbidden ? <PageError message="You do not have permission to administer games." /> : response.error ? <PageError message="Games could not be loaded." onRetry={() => setRetryKey((value) => value + 1)} /> : response.result?.items.length ? <><div className="admin-game-list">{response.result.items.map((item) => <article className="admin-game-row" key={item.id}><div><p><time dateTime={item.releaseDate}>{new Date(`${item.releaseDate}T00:00:00`).toLocaleDateString()}</time></p><h2>{item.title}</h2><p>{item.description || 'No description provided.'}</p></div><div className="admin-game-row__actions"><Link to={`/admin/games/${item.id}/edit`} aria-label={`Edit ${item.title}`}>Edit</Link><button className="button--danger" type="button" aria-label={`Archive ${item.title}`} onClick={() => setSelected(item)}>Archive</button></div></article>)}</div><Pagination page={response.result.page} pageSize={response.result.pageSize} totalCount={response.result.totalCount} onPageChange={(value) => setParams(updateQuery(params, { page: value }))} /></> : <EmptyState title="No active games found"><p>Create a game or change the current search and release filter.</p></EmptyState>}
    <ConfirmDialog isOpen={!!selected} title={`Archive ${selected?.title}?`} description={`The game will leave public browsing and Author selection. Existing published retrospectives will retain ${selected?.title} as their game attribution.`} confirmLabel="Archive game" isPending={archivePending} onConfirm={confirmArchive} onCancel={() => setSelected(null)} />
  </section>
}
