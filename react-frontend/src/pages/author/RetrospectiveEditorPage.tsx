import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { listAllGames } from '../../api/gamesApi'
import { ApiError } from '../../api/http'
import { archiveRetrospective, changeRetrospectiveStatus, createRetrospective, getOwnRetrospective, updateRetrospective } from '../../api/retrospectivesApi'
import type { AuthorRetrospectiveStatus, Game, Retrospective } from '../../api/types'
import { useSession } from '../../auth/useSession'
import { LoadingState, PageError } from '../../components/feedback/Feedback'
import { RetrospectiveForm } from '../../components/retrospectives/RetrospectiveForm'
import { emptyRetrospectiveDraft } from '../../components/retrospectives/retrospectiveFormModel'
import { RetrospectiveLifecycle } from '../../components/retrospectives/RetrospectiveLifecycle'
import { useSessionDraft, type RetrospectiveDraft } from '../../hooks/useSessionDraft'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'

function toDraft(value: Retrospective): RetrospectiveDraft {
  return { gameId: value.gameId, title: value.title, reviewContent: value.reviewContent, imageUrl: value.imageUrl ?? '', rating: value.rating, status: value.status as AuthorRetrospectiveStatus, unpublishedReason: value.unpublishedReason ?? '' }
}

function sameDraft(left: RetrospectiveDraft, right: RetrospectiveDraft) {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function RetrospectiveEditorPage() {
  const { retrospectiveId } = useParams()
  const resourceId = retrospectiveId ?? 'new'
  const isEdit = !!retrospectiveId
  const session = useSession()
  const navigate = useNavigate()
  const storage = useSessionDraft(resourceId, session.user?.id ?? '')
  const [games, setGames] = useState<Game[]>([])
  const [loaded, setLoaded] = useState<Retrospective | null>(null)
  const [draft, setDraft] = useState<RetrospectiveDraft>(emptyRetrospectiveDraft)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [conflict, setConflict] = useState(false)
  const baseline = loaded ? toDraft(loaded) : emptyRetrospectiveDraft()
  const dirty = !sameDraft(draft, baseline)
  const navigation = useUnsavedChanges(dirty)

  useEffect(() => {
    if (!session.token) return
    const controller = new AbortController()
    const gamesRequest = listAllGames(controller.signal)
    const retrospectiveRequest = retrospectiveId ? getOwnRetrospective(retrospectiveId, session.token, { signal: controller.signal, onUnauthorized: session.onUnauthorized }) : Promise.resolve(null)
    Promise.all([gamesRequest, retrospectiveRequest]).then(([gameOptions, retrospective]) => {
      setGames(gameOptions)
      if (retrospective) { setLoaded(retrospective); setDraft(toDraft(retrospective)) }
      const recovered = storage.restore()
      if (recovered) { setDraft(recovered); setMessage('Your draft was restored after sign-in.') }
      setLoading(false)
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      setLoadError(error instanceof ApiError && error.status === 404 ? 'This retrospective is unavailable.' : 'The editor could not be loaded.')
      setLoading(false)
    })
    return () => controller.abort()
  // Resource changes remount this route in normal navigation; storage functions intentionally stay local.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retrospectiveId, session.token, session.onUnauthorized])

  function requestOptions() { return { onUnauthorized: session.onUnauthorized } }
  function handleFailure(error: unknown) {
    if (error instanceof ApiError) {
      setFieldErrors(error.fieldErrors)
      if (error.status === 401) {
        storage.save(draft)
        session.onUnauthorized()
        setMessage('Your session expired. Your draft is stored for sign-in recovery.')
      } else if (error.status === 409) {
        setConflict(true)
        setMessage('Another version was saved. Your draft has been preserved.')
      } else setMessage(error.message)
    } else setMessage('The retrospective could not be saved. Your draft is still here.')
  }
  async function save(value: RetrospectiveDraft) {
    if (!session.token || pending) return
    setPending(true); setMessage(''); setFieldErrors({}); setConflict(false)
    try {
      const body = { gameId: value.gameId, title: value.title.trim(), reviewContent: value.reviewContent.trim(), imageUrl: value.imageUrl.trim() || null, rating: value.rating }
      const result = loaded && retrospectiveId
        ? await updateRetrospective(retrospectiveId, { ...body, rowVersion: loaded.rowVersion }, session.token, requestOptions())
        : await createRetrospective({ ...body, status: value.status, unpublishedReason: value.status === 'unpublished' ? value.unpublishedReason.trim() : null }, session.token, requestOptions())
      storage.discard(); setLoaded(result); setDraft(toDraft(result)); setMessage('Retrospective saved.')
      if (!isEdit) window.setTimeout(() => navigate(`/dashboard/retrospectives/${result.id}/edit`, { replace: true }), 0)
    } catch (error) { handleFailure(error) } finally { setPending(false) }
  }
  async function changeStatus(status: AuthorRetrospectiveStatus, reason: string) {
    if (!session.token || !retrospectiveId || !loaded || pending) return
    setPending(true); setMessage(''); setConflict(false)
    try {
      const result = await changeRetrospectiveStatus(retrospectiveId, { status, unpublishedReason: status === 'unpublished' ? reason : null, rowVersion: loaded.rowVersion }, session.token, requestOptions())
      setLoaded(result)
      setDraft((current) => ({ ...current, status: result.status as AuthorRetrospectiveStatus, unpublishedReason: result.unpublishedReason ?? '' }))
      storage.discard(); setMessage(`Status changed to ${status}.`)
    } catch (error) { handleFailure(error) } finally { setPending(false) }
  }
  async function archive() {
    if (!session.token || !retrospectiveId || !loaded || pending) return
    setPending(true)
    try { await archiveRetrospective(retrospectiveId, loaded.rowVersion, session.token, requestOptions()); storage.discard(); setDraft(toDraft(loaded)); window.setTimeout(() => navigate('/dashboard/retrospectives', { replace: true }), 0) }
    catch (error) { handleFailure(error); setPending(false) }
  }
  async function refreshConflictVersion() {
    if (!session.token || !retrospectiveId) return
    setPending(true)
    try {
      const current = await getOwnRetrospective(retrospectiveId, session.token, requestOptions())
      setLoaded(current); setConflict(false); setMessage('The latest server version is ready. Your draft was not replaced; review it and save again when ready.')
    } catch (error) { handleFailure(error) } finally { setPending(false) }
  }

  if (loading) return <LoadingState label="Loading retrospective editor..." />
  if (loadError) return <PageError message={loadError} />
  return <section className="editor-page"><header className="page-heading"><p className="eyebrow">Author workspace</p><h1>{isEdit ? 'Edit retrospective' : 'New retrospective'}</h1><Link to="/dashboard/retrospectives">Back to My Retrospectives</Link></header>
    {message && <p className={conflict ? 'conflict-message' : 'notice'} role="status">{message}</p>}
    {conflict && <section className="conflict-panel"><h2>Keep both versions safe</h2><p>Load only the newest row version. Your title and review text will remain unchanged.</p><button type="button" disabled={pending} onClick={refreshConflictVersion}>Load current server version</button></section>}
    <div className={isEdit ? 'editor-grid' : 'editor-grid editor-grid--single'}><RetrospectiveForm games={games} draft={draft} onDraftChange={setDraft} onSubmit={save} errors={fieldErrors} isPending={pending} isEdit={isEdit} />{loaded && retrospectiveId && <RetrospectiveLifecycle title={draft.title || loaded.title} status={loaded.status as AuthorRetrospectiveStatus} isPending={pending} onStatusChange={changeStatus} onArchive={archive} />}</div>
    {navigation.isBlocked && <section className="navigation-warning" role="alertdialog" aria-labelledby="unsaved-title"><h2 id="unsaved-title">Leave with unsaved changes?</h2><p>Your current edits will be lost.</p><button type="button" onClick={navigation.reset}>Keep editing</button><button className="button--danger" type="button" onClick={() => { storage.discard(); navigation.proceed() }}>Discard and leave</button></section>}
  </section>
}
