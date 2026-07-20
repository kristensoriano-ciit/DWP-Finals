import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { listPublishedRetrospectives } from '../../api/retrospectivesApi'
import { pageOf, retrospective } from '../../test/publicFixtures'
import { HomePage } from './HomePage'

vi.mock('../../api/retrospectivesApi', () => ({ listPublishedRetrospectives: vi.fn() }))

it('loads newest and best once and reuses newest for the feature', async () => {
  vi.mocked(listPublishedRetrospectives).mockResolvedValue(pageOf([retrospective]))
  render(<MemoryRouter><HomePage /></MemoryRouter>)
  expect(screen.getByRole('status')).toHaveTextContent('Loading featured')
  expect(await screen.findByRole('heading', { name: retrospective.title, level: 1 })).toBeInTheDocument()
  expect(listPublishedRetrospectives).toHaveBeenCalledTimes(2)
  expect(vi.mocked(listPublishedRetrospectives).mock.calls[0][0]).toMatchObject({ sort: 'newest', pageSize: 4 })
})

it('keeps successful newest content when best fails', async () => {
  vi.mocked(listPublishedRetrospectives).mockResolvedValueOnce(pageOf([retrospective])).mockRejectedValueOnce(new Error('Best unavailable'))
  render(<MemoryRouter><HomePage /></MemoryRouter>)
  expect(await screen.findByRole('heading', { name: retrospective.title })).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('Best unavailable')
})
