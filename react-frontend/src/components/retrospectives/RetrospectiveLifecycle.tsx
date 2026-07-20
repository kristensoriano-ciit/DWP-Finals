import { useState } from 'react'
import type { AuthorRetrospectiveStatus } from '../../api/types'
import { ConfirmDialog } from '../forms/ConfirmDialog'

const labels: Record<AuthorRetrospectiveStatus, string> = { draft: 'Draft', review: 'Review', published: 'Published', unpublished: 'Unpublished' }

type Props = { title: string; status: AuthorRetrospectiveStatus; isPending: boolean; onStatusChange: (status: AuthorRetrospectiveStatus, reason: string) => void; onArchive: () => void }

export function RetrospectiveLifecycle({ title, status, isPending, onStatusChange, onArchive }: Props) {
  const [nextStatus, setNextStatus] = useState<AuthorRetrospectiveStatus>(status)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [confirming, setConfirming] = useState(false)
  function submitStatus() {
    if (nextStatus === 'unpublished' && !reason.trim()) { setReasonError('Enter a reason for unpublishing.'); return }
    setReasonError('')
    onStatusChange(nextStatus, nextStatus === 'unpublished' ? reason.trim() : '')
  }
  return <section className="lifecycle" aria-labelledby="lifecycle-heading"><h2 id="lifecycle-heading">Publication</h2><p>Current status: <strong className={`status status--${status}`}>{labels[status]}</strong></p>
    <label htmlFor="nextStatus">Change status</label><select id="nextStatus" value={nextStatus} disabled={isPending} onChange={(event) => { setNextStatus(event.target.value as AuthorRetrospectiveStatus); setReason(''); setReasonError('') }}>{Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
    {nextStatus === 'unpublished' && <><label htmlFor="lifecycleReason">Reason for unpublishing</label><textarea id="lifecycleReason" maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} aria-invalid={!!reasonError} aria-describedby={reasonError ? 'lifecycleReason-error' : undefined} />{reasonError && <p id="lifecycleReason-error" className="field-error" role="alert">{reasonError}</p>}</>}
    <div className="lifecycle__actions"><button type="button" disabled={isPending || nextStatus === status} onClick={submitStatus}>Update status</button><button className="button--danger" type="button" disabled={isPending} onClick={() => setConfirming(true)}>Archive</button></div>
    <ConfirmDialog isOpen={confirming} title="Archive retrospective?" description={`Archive “${title}”? It will no longer be editable.`} confirmLabel="Archive retrospective" isPending={isPending} onCancel={() => setConfirming(false)} onConfirm={onArchive} />
  </section>
}
