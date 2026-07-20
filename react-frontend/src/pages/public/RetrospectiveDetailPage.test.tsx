import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ApiError } from '../../api/http'
import { getPublishedRetrospective } from '../../api/retrospectivesApi'
import { retrospective } from '../../test/publicFixtures'
import { RetrospectiveDetailPage } from './RetrospectiveDetailPage'

vi.mock('../../api/retrospectivesApi', () => ({ getPublishedRetrospective: vi.fn() }))

function renderPage() { return render(<MemoryRouter initialEntries={['/retrospectives/retro-1']}><Routes><Route path="/retrospectives/:retrospectiveId" element={<RetrospectiveDetailPage />} /></Routes></MemoryRouter>) }

it('renders complete publication metadata and content', async () => {
  vi.mocked(getPublishedRetrospective).mockResolvedValue(retrospective)
  renderPage()
  expect(await screen.findByRole('heading', { name: retrospective.title })).toBeInTheDocument()
  expect(screen.getByText('By Ada')).toBeInTheDocument()
  expect(screen.getByText('It remains unforgettable.')).toBeInTheDocument()
  expect(screen.getByLabelText('Rated 9 out of 10')).toBeInTheDocument()
})

it('maps unavailable published content to not found', async () => {
  vi.mocked(getPublishedRetrospective).mockRejectedValue(new ApiError(404))
  renderPage()
  expect(await screen.findByRole('heading', { name: 'Retrospective not found' })).toBeInTheDocument()
})
