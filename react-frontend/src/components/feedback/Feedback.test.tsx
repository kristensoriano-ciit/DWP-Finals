import { render, screen } from '@testing-library/react'
import { EmptyState, FieldErrorSummary, LiveStatus, LoadingState, PageError } from './Feedback'

it('provides accessible feedback states', () => {
  const { rerender } = render(<LoadingState />)
  expect(screen.getByRole('status')).toHaveTextContent('Loading')
  rerender(<EmptyState title="Nothing here"><button>Clear filters</button></EmptyState>)
  expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeInTheDocument()
  rerender(<PageError message="Unavailable" />)
  expect(screen.getByRole('alert')).toHaveTextContent('Unavailable')
  rerender(<FieldErrorSummary errors={{ title: ['Enter a title'] }} />)
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a title')
  rerender(<LiveStatus>Saved</LiveStatus>)
  expect(screen.getByRole('status')).toHaveTextContent('Saved')
})
