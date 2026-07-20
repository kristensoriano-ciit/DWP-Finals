import { fireEvent, render, screen } from '@testing-library/react'
import { ContentImage } from './ContentImage'

it.each([undefined, 'not a URL', 'http://example.test/image.jpg'])('uses a labeled stable fallback for %s', (src) => {
  render(<ContentImage src={src} alt="Control cover" />)
  expect(screen.getByRole('img', { name: 'Control cover image unavailable' })).toBeInTheDocument()
})

it('shows HTTPS images and falls back after failure', () => {
  render(<ContentImage src="https://example.test/image.jpg" alt="Control cover" />)
  fireEvent.error(screen.getByRole('img', { name: 'Control cover' }))
  expect(screen.getByRole('img', { name: 'Control cover image unavailable' })).toBeInTheDocument()
})
