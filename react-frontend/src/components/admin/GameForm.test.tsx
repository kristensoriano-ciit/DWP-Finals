import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import type { GameRequest } from '../../api/types'
import { GameForm } from './GameForm'
import { emptyGameDraft } from './gameFormModel'

function ControlledForm({ onSubmit = vi.fn(), errors = {}, pending = false }: { onSubmit?: (value: GameRequest) => void; errors?: Record<string, string[]>; pending?: boolean }) {
  const [draft, setDraft] = useState(emptyGameDraft())
  return <GameForm draft={draft} onDraftChange={setDraft} onSubmit={onSubmit} errors={errors} isPending={pending} />
}

it('validates catalog limits and associates feedback with every field', async () => {
  const onSubmit = vi.fn()
  render(<ControlledForm onSubmit={onSubmit} />)
  await userEvent.click(screen.getByRole('button', { name: 'Create game' }))
  expect((await screen.findAllByText('Enter a game title.')).length).toBeGreaterThan(0)
  expect(screen.getAllByText('Choose a release date.').length).toBeGreaterThan(0)
  expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByLabelText('Title')).toHaveAttribute('aria-describedby', 'title-error')
  expect(screen.getByLabelText('Release date')).toHaveAttribute('aria-describedby', 'releaseDate-error')
  expect(onSubmit).not.toHaveBeenCalled()

  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'A'.repeat(201) } })
  fireEvent.change(screen.getByLabelText('Description (optional)'), { target: { value: 'B'.repeat(2001) } })
  fireEvent.change(screen.getByLabelText('Release date'), { target: { value: '2026-07-21' } })
  fireEvent.change(screen.getByLabelText('Cover image URL (optional)'), { target: { value: 'http://images.example.test/game.jpg' } })
  await userEvent.click(screen.getByRole('button', { name: 'Create game' }))
  expect(screen.getAllByText('Title cannot exceed 200 characters.').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Description cannot exceed 2,000 characters.').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Use an HTTPS cover image URL.').length).toBeGreaterThan(0)
})

it('is controlled, submits normalized optional values, and preserves safe values after server feedback', async () => {
  const onSubmit = vi.fn()
  const { rerender } = render(<ControlledForm onSubmit={onSubmit} />)
  await userEvent.type(screen.getByLabelText('Title'), 'Control')
  await userEvent.type(screen.getByLabelText('Description (optional)'), 'Keep this description')
  await userEvent.type(screen.getByLabelText('Release date'), '2019-08-27')
  await userEvent.click(screen.getByRole('button', { name: 'Create game' }))
  expect(onSubmit).toHaveBeenCalledWith({ title: 'Control', description: 'Keep this description', releaseDate: '2019-08-27', coverImageUrl: null })
  rerender(<ControlledForm errors={{ title: ['A game with this title already exists.'] }} />)
  expect(screen.getAllByText('A game with this title already exists.').length).toBeGreaterThan(0)
})

it('disables submission and announces pending work', () => {
  render(<ControlledForm pending />)
  expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()
  expect(screen.getByRole('status')).toHaveTextContent('Saving game...')
})
