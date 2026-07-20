import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Game } from '../../api/types'
import { GameCard } from './GameCard'

const game: Game = { id: 'g1', title: 'Control', description: 'The Oldest House', releaseDate: '2019-08-27', coverImageUrl: null, isActive: true, createdAtUtc: '', updatedAtUtc: '', archivedAtUtc: null }

it('renders game details with secure internal links', () => {
  render(<MemoryRouter><GameCard game={game} /></MemoryRouter>)
  expect(screen.getByRole('heading', { name: 'Control' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Control' })).toHaveAttribute('href', '/games/g1')
})
