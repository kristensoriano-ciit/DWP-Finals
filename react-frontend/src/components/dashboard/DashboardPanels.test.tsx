import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { listGames } from '../../api/gamesApi'
import { listPublishedRetrospectives } from '../../api/retrospectivesApi'
import { game, pageOf, retrospective } from '../../test/publicFixtures'
import { DashboardPanels } from './DashboardPanels'

vi.mock('../../api/gamesApi', () => ({ listGames: vi.fn() }))
vi.mock('../../api/retrospectivesApi', () => ({ listPublishedRetrospectives: vi.fn() }))

beforeEach(() => {
  vi.mocked(listGames).mockReset()
  vi.mocked(listPublishedRetrospectives).mockReset()
})

it('concurrently loads three bounded dashboard collections', async () => {
  vi.mocked(listGames).mockResolvedValue(pageOf([game], 1, 3))
  vi.mocked(listPublishedRetrospectives).mockResolvedValue(pageOf([retrospective], 1, 3))

  render(<MemoryRouter><DashboardPanels /></MemoryRouter>)

  expect(listGames).toHaveBeenCalledWith({ releaseWindow: 'new', page: 1, pageSize: 3 }, expect.any(AbortSignal))
  expect(listGames).toHaveBeenCalledWith({ releaseWindow: 'upcoming', page: 1, pageSize: 3 }, expect.any(AbortSignal))
  expect(listPublishedRetrospectives).toHaveBeenCalledWith({ sort: 'best', page: 1, pageSize: 3 }, expect.any(AbortSignal))
  expect(await screen.findAllByRole('heading', { name: game.title })).toHaveLength(2)
  expect(screen.getByRole('heading', { name: retrospective.title })).toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: /View all/i })).toHaveLength(3)
  expect(screen.getAllByRole('link', { name: /View all/i }).map((link) => link.getAttribute('href'))).toEqual([
    '/games?releaseWindow=new',
    '/games?releaseWindow=upcoming',
    '/retrospectives?sort=best',
  ])
})

it('keeps successful and empty panels visible when another request fails', async () => {
  vi.mocked(listGames)
    .mockRejectedValueOnce(new Error('new releases unavailable'))
    .mockResolvedValueOnce(pageOf([], 1, 3))
  vi.mocked(listPublishedRetrospectives).mockResolvedValue(pageOf([retrospective], 1, 3))

  render(<MemoryRouter><DashboardPanels /></MemoryRouter>)

  expect(await screen.findByText('New releases could not be loaded.')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'No upcoming releases' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: retrospective.title })).toBeInTheDocument()
})
