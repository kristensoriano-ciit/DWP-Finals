import { useState, type FormEvent } from 'react'
import type { GameRequest } from '../../api/types'
import { FieldErrorSummary, LiveStatus } from '../feedback/Feedback'
import { validateGameDraft, type GameDraft } from './gameFormModel'

type Props = {
  draft: GameDraft
  onDraftChange: (draft: GameDraft) => void
  onSubmit: (value: GameRequest) => void
  errors?: Record<string, string[]>
  isPending?: boolean
  isEdit?: boolean
}

export function GameForm({ draft, onDraftChange, onSubmit, errors: serverErrors = {}, isPending = false, isEdit = false }: Props) {
  const [clientErrors, setClientErrors] = useState<Record<string, string[]>>({})
  const errors = { ...serverErrors, ...clientErrors }
  function change(values: Partial<GameDraft>) { onDraftChange({ ...draft, ...values }) }
  function describedBy(name: string, guidance?: string) { return [guidance, errors[name]?.length ? `${name}-error` : ''].filter(Boolean).join(' ') || undefined }
  function fieldErrors(name: string) { return errors[name]?.map((message, index) => <p id={index === 0 ? `${name}-error` : undefined} className="field-error" role="alert" key={message}>{message}</p>) }
  function submit(event: FormEvent) {
    event.preventDefault()
    const nextErrors = validateGameDraft(draft)
    setClientErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    onSubmit({
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      releaseDate: draft.releaseDate,
      coverImageUrl: draft.coverImageUrl.trim() || null,
    })
  }
  return <form className="game-form" onSubmit={submit} noValidate>
    <FieldErrorSummary errors={errors} />
    <label htmlFor="title">Title</label><input id="title" maxLength={200} value={draft.title} onChange={(event) => change({ title: event.target.value })} aria-invalid={!!errors.title} aria-describedby={describedBy('title')} />{fieldErrors('title')}
    <label htmlFor="description">Description (optional)</label><textarea id="description" rows={7} maxLength={2000} value={draft.description} onChange={(event) => change({ description: event.target.value })} aria-invalid={!!errors.description} aria-describedby={describedBy('description')} />{fieldErrors('description')}
    <label htmlFor="releaseDate">Release date</label><input id="releaseDate" type="date" value={draft.releaseDate} onChange={(event) => change({ releaseDate: event.target.value })} aria-invalid={!!errors.releaseDate} aria-describedby={describedBy('releaseDate')} />{fieldErrors('releaseDate')}
    <label htmlFor="coverImageUrl">Cover image URL (optional)</label><input id="coverImageUrl" type="url" maxLength={2048} placeholder="https://" value={draft.coverImageUrl} onChange={(event) => change({ coverImageUrl: event.target.value })} aria-describedby={describedBy('coverImageUrl', 'cover-guidance')} aria-invalid={!!errors.coverImageUrl} /><p id="cover-guidance" className="field-guidance">Use an HTTPS image so the cover can be displayed securely.</p>{fieldErrors('coverImageUrl')}
    <button type="submit" disabled={isPending}>{isPending ? 'Saving...' : isEdit ? 'Save changes' : 'Create game'}</button>
    {isPending && <LiveStatus>Saving game...</LiveStatus>}
  </form>
}
