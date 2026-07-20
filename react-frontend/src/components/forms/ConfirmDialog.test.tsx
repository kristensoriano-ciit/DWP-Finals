import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from './ConfirmDialog'

function Harness() {
  const [open, setOpen] = useState(false)
  return <><button onClick={() => setOpen(true)}>Archive</button><ConfirmDialog isOpen={open} title="Archive Control?" description="This cannot be undone." confirmLabel="Archive" onConfirm={vi.fn()} onCancel={() => setOpen(false)} /></>
}

it('labels the dialog, focuses cancellation, and restores trigger focus', async () => {
  const showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute('open', '') })
  const close = vi.fn(function (this: HTMLDialogElement) { this.removeAttribute('open') })
  HTMLDialogElement.prototype.showModal = showModal
  HTMLDialogElement.prototype.close = close
  render(<Harness />)
  const trigger = screen.getByRole('button', { name: 'Archive' })
  await userEvent.click(trigger)
  expect(screen.getByRole('dialog', { name: 'Archive Control?' })).toBeInTheDocument()
  expect(showModal).toHaveBeenCalledOnce()
  expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(trigger).toHaveFocus()
  expect(close).toHaveBeenCalledOnce()
})

it('confirms once and disables a pending action', async () => {
  const onConfirm = vi.fn()
  render(<ConfirmDialog isOpen title="Delete?" description="Permanent" confirmLabel="Delete" isPending onConfirm={onConfirm} onCancel={vi.fn()} />)
  expect(screen.getByRole('button', { name: 'Working...' })).toBeDisabled()
})

it('supports native cancellation and confirmation', async () => {
  const onCancel = vi.fn()
  const onConfirm = vi.fn()
  const view = render(<ConfirmDialog isOpen title="Delete?" description="Permanent" confirmLabel="Delete" onConfirm={onConfirm} onCancel={onCancel} />)
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
  expect(onCancel).toHaveBeenCalledOnce()
  await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
  expect(onConfirm).toHaveBeenCalledOnce()
  view.unmount()
})
