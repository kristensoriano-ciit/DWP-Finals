import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RetrospectiveForm } from './RetrospectiveForm'
import { emptyRetrospectiveDraft } from './retrospectiveFormModel'

const games = [{ id: 'game-1', title: 'Control', description: null, releaseDate: '2019-01-01', coverImageUrl: null, isActive: true, createdAtUtc: '', updatedAtUtc: '', archivedAtUtc: null }]

describe('RetrospectiveForm', () => {
  it('associates each validation error with its field', async () => {
    render(<RetrospectiveForm games={games} draft={emptyRetrospectiveDraft()} onDraftChange={vi.fn()} onSubmit={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Create retrospective' }))
    for (const name of ['Game', 'Title', 'Retrospective']) {
      const field = screen.getByLabelText(name)
      expect(field).toHaveAttribute('aria-describedby')
      expect(document.getElementById(field.getAttribute('aria-describedby')!)).toHaveClass('field-error')
    }
  })
  it('defaults new work to Draft and validates all editable fields', async () => {
    const onSubmit = vi.fn()
    render(<RetrospectiveForm games={games} draft={emptyRetrospectiveDraft()} onDraftChange={vi.fn()} onSubmit={onSubmit} />)
    expect(screen.getByLabelText('Initial status')).toHaveValue('draft')
    await userEvent.click(screen.getByRole('button', { name: 'Create retrospective' }))
    expect((await screen.findAllByText('Choose a game.')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Enter a title.').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Enter your retrospective.').length).toBeGreaterThan(0)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('requires and clears an unpublish reason and rejects non-HTTPS images', async () => {
    function Harness() {
      const [draft, setDraft] = React.useState({ ...emptyRetrospectiveDraft(), gameId: 'game-1', title: 'Title', reviewContent: 'Body' })
      return <RetrospectiveForm games={games} draft={draft} onDraftChange={setDraft} onSubmit={vi.fn()} />
    }
    const React = await import('react')
    render(<Harness />)
    await userEvent.selectOptions(screen.getByLabelText('Initial status'), 'unpublished')
    expect(screen.getByLabelText('Reason for unpublishing')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Image URL (optional)'), 'http://example.test/image.jpg')
    await userEvent.click(screen.getByRole('button', { name: 'Create retrospective' }))
    expect(screen.getAllByText('Enter a reason for unpublishing.').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Use an HTTPS image URL.').length).toBeGreaterThan(0)
    await userEvent.selectOptions(screen.getByLabelText('Initial status'), 'review')
    expect(screen.queryByLabelText('Reason for unpublishing')).not.toBeInTheDocument()
  })
})
