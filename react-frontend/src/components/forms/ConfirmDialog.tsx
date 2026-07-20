import { useEffect, useRef } from 'react'

type ConfirmDialogProps = {
  isOpen: boolean
  title: string
  description: string
  confirmLabel: string
  isPending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ isOpen, title, description, confirmLabel, isPending = false, onConfirm, onCancel }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen) {
      previousFocus.current = document.activeElement as HTMLElement
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') dialog.showModal()
        else dialog.setAttribute('open', '')
      }
      cancelRef.current?.focus()
      return
    }
    if (dialog.open) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
    }
    previousFocus.current?.focus()
  }, [isOpen])

  return <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby="confirm-title" aria-describedby="confirm-description" onCancel={(event) => { event.preventDefault(); onCancel() }}>
    <h2 id="confirm-title">{title}</h2>
    <p id="confirm-description">{description}</p>
    <div className="dialog-actions">
      <button ref={cancelRef} type="button" onClick={onCancel}>Cancel</button>
      <button className="button--danger" type="button" disabled={isPending} onClick={onConfirm}>{isPending ? 'Working...' : confirmLabel}</button>
    </div>
  </dialog>
}
