import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RetrospectiveLifecycle } from './RetrospectiveLifecycle'

describe('RetrospectiveLifecycle', () => {
  it('offers every author status and requires an unpublish reason', async () => {
    const onStatusChange = vi.fn()
    render(<RetrospectiveLifecycle title="A second look" status="draft" isPending={false} onStatusChange={onStatusChange} onArchive={vi.fn()} />)
    expect(screen.getByLabelText('Change status')).toHaveTextContent('DraftReviewPublishedUnpublished')
    await userEvent.selectOptions(screen.getByLabelText('Change status'), 'unpublished')
    await userEvent.click(screen.getByRole('button', { name: 'Update status' }))
    expect(screen.getByText('Enter a reason for unpublishing.')).toBeInTheDocument()
    expect(onStatusChange).not.toHaveBeenCalled()
    await userEvent.type(screen.getByLabelText('Reason for unpublishing'), 'Needs another pass')
    await userEvent.click(screen.getByRole('button', { name: 'Update status' }))
    expect(onStatusChange).toHaveBeenCalledWith('unpublished', 'Needs another pass')
  })

  it('names the retrospective in archive confirmation', async () => {
    const onArchive = vi.fn()
    render(<RetrospectiveLifecycle title="A second look" status="published" isPending={false} onStatusChange={vi.fn()} onArchive={onArchive} />)
    await userEvent.click(screen.getByRole('button', { name: 'Archive' }))
    expect(screen.getByText(/Archive “A second look”/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Archive retrospective' }))
    expect(onArchive).toHaveBeenCalledOnce()
  })
})
