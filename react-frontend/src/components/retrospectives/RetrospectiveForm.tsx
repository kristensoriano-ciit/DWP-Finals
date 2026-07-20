import { useState, type FormEvent } from 'react'
import type { Game } from '../../api/types'
import { FieldErrorSummary, LiveStatus } from '../feedback/Feedback'
import type { RetrospectiveDraft } from '../../hooks/useSessionDraft'
import { validateRetrospectiveDraft } from './retrospectiveFormModel'

type Props = {
  games: Game[]
  draft: RetrospectiveDraft
  onDraftChange: (draft: RetrospectiveDraft) => void
  onSubmit: (draft: RetrospectiveDraft) => void
  errors?: Record<string, string[]>
  isPending?: boolean
  isEdit?: boolean
}

export function RetrospectiveForm({ games, draft, onDraftChange, onSubmit, errors: serverErrors = {}, isPending = false, isEdit = false }: Props) {
  const [clientErrors, setClientErrors] = useState<Record<string, string[]>>({})
  const errors = { ...serverErrors, ...clientErrors }
  function change(values: Partial<RetrospectiveDraft>) {
    const next = { ...draft, ...values }
    if (values.status && values.status !== 'unpublished') next.unpublishedReason = ''
    onDraftChange(next)
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    const nextErrors = validateRetrospectiveDraft(draft)
    setClientErrors(nextErrors)
    if (!Object.keys(nextErrors).length) onSubmit(draft)
  }
  function describedBy(name: string, guidance?: string) { return [guidance, errors[name]?.length ? `${name}-error` : ''].filter(Boolean).join(' ') || undefined }
  function fieldErrors(name: string) { return errors[name]?.map((message, index) => <p id={index === 0 ? `${name}-error` : undefined} className="field-error" role="alert" key={message}>{message}</p>) }
  return <form className="retrospective-form" onSubmit={submit} noValidate>
    <FieldErrorSummary errors={errors} />
    <label htmlFor="gameId">Game</label><select id="gameId" value={draft.gameId} onChange={(event) => change({ gameId: event.target.value })} aria-invalid={!!errors.gameId} aria-describedby={describedBy('gameId')}><option value="">Choose a game</option>{games.map((game) => <option value={game.id} key={game.id}>{game.title}</option>)}</select>{fieldErrors('gameId')}
    <label htmlFor="title">Title</label><input id="title" maxLength={200} value={draft.title} onChange={(event) => change({ title: event.target.value })} aria-invalid={!!errors.title} aria-describedby={describedBy('title')} />{fieldErrors('title')}
    <label htmlFor="reviewContent">Retrospective</label><textarea id="reviewContent" rows={12} maxLength={20_000} value={draft.reviewContent} onChange={(event) => change({ reviewContent: event.target.value })} aria-invalid={!!errors.reviewContent} aria-describedby={describedBy('reviewContent')} />{fieldErrors('reviewContent')}
    <label htmlFor="imageUrl">Image URL (optional)</label><input id="imageUrl" type="url" maxLength={2048} placeholder="https://" value={draft.imageUrl} onChange={(event) => change({ imageUrl: event.target.value })} aria-describedby={describedBy('imageUrl', 'image-guidance')} aria-invalid={!!errors.imageUrl} /><p id="image-guidance" className="field-guidance">Use an HTTPS image so it can be displayed securely.</p>{fieldErrors('imageUrl')}
    <label htmlFor="rating">Rating</label><input id="rating" type="number" min="1" max="10" value={draft.rating} onChange={(event) => change({ rating: Number(event.target.value) })} aria-invalid={!!errors.rating} aria-describedby={describedBy('rating')} />{fieldErrors('rating')}
    {!isEdit && <><label htmlFor="status">Initial status</label><select id="status" value={draft.status} onChange={(event) => change({ status: event.target.value as RetrospectiveDraft['status'] })}><option value="draft">Draft</option><option value="review">Review</option><option value="published">Published</option><option value="unpublished">Unpublished</option></select></>}
    {!isEdit && draft.status === 'unpublished' && <><label htmlFor="unpublishedReason">Reason for unpublishing</label><textarea id="unpublishedReason" maxLength={500} value={draft.unpublishedReason} onChange={(event) => change({ unpublishedReason: event.target.value })} aria-invalid={!!errors.unpublishedReason} aria-describedby={describedBy('unpublishedReason')} />{fieldErrors('unpublishedReason')}</>}
    <button type="submit" disabled={isPending}>{isPending ? 'Saving...' : isEdit ? 'Save changes' : 'Create retrospective'}</button>
    {isPending && <LiveStatus>Saving retrospective...</LiveStatus>}
  </form>
}
