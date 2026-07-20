import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { PublishedRetrospective } from '../../api/types'
import { RetrospectiveCard } from './RetrospectiveCard'

const item: PublishedRetrospective = { id: 'r1', gameId: 'g1', gameTitle: 'Control', authorUserId: 'u1', authorDisplayName: 'Ada', title: 'Still strange', reviewContent: 'A thoughtful return.', imageUrl: null, rating: 8, publishedAtUtc: '2026-07-01T00:00:00Z' }

it('renders rating, author and publication metadata with internal links', () => {
  render(<MemoryRouter><RetrospectiveCard retrospective={item} /></MemoryRouter>)
  expect(screen.getByLabelText('Rated 8 out of 10')).toBeInTheDocument()
  expect(screen.getByText('By Ada')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Still strange' })).toHaveAttribute('href', '/retrospectives/r1')
})
