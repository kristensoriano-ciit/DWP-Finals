import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { createGame, getGame, updateGame } from '../../api/gamesApi'
import { ApiError } from '../../api/http'
import type { Game, GameRequest } from '../../api/types'
import { useSession } from '../../auth/useSession'
import { GameForm } from '../../components/admin/GameForm'
import { emptyGameDraft, type GameDraft } from '../../components/admin/gameFormModel'
import { LoadingState, PageError } from '../../components/feedback/Feedback'

function toDraft(game: Game): GameDraft {
  return { title: game.title, description: game.description ?? '', releaseDate: game.releaseDate, coverImageUrl: game.coverImageUrl ?? '' }
}

export function AdminGameEditorPage() {
  const { gameId } = useParams()
  const isEdit = !!gameId
  const session = useSession()
  const [draft, setDraft] = useState<GameDraft>(emptyGameDraft)
  const [loading, setLoading] = useState(isEdit)
  const [loadError, setLoadError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!gameId) return
    const controller = new AbortController()
    getGame(gameId, controller.signal).then((game) => { setDraft(toDraft(game)); setLoading(false) }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      setLoadError(error instanceof ApiError && error.status === 404 ? 'This active game was not found.' : 'The game editor could not be loaded.')
      setLoading(false)
    })
    return () => controller.abort()
  }, [gameId])

  async function save(body: GameRequest) {
    if (!session.token || pending) return
    setPending(true); setMessage(''); setFieldErrors({})
    try {
      const result = gameId
        ? await updateGame(gameId, body, session.token, { onUnauthorized: session.onUnauthorized })
        : await createGame(body, session.token, { onUnauthorized: session.onUnauthorized })
      setDraft(toDraft(result))
      setMessage(gameId ? 'Game updated.' : 'Game created.')
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors)
        if (error.status === 403) setMessage('You do not have permission to save games.')
        else if (error.status === 409) setMessage(error.message)
        else if (error.status !== 400) setMessage(error.message)
      } else setMessage('The game could not be saved. Your values are still here.')
    } finally { setPending(false) }
  }

  if (loading) return <LoadingState label="Loading game editor..." />
  if (loadError) return <PageError message={loadError} />
  return <section className="admin-editor"><header className="page-heading"><p className="eyebrow">Administration</p><h1>{isEdit ? 'Edit game' : 'New game'}</h1><Link to="/admin/games">Back to game administration</Link></header>
    {message && <p className={message.includes('could not') || message.includes('already') || message.includes('permission') ? 'form-message form-message--error' : 'notice'} role="status">{message}</p>}
    <GameForm draft={draft} onDraftChange={setDraft} onSubmit={save} errors={fieldErrors} isPending={pending} isEdit={isEdit} />
  </section>
}
