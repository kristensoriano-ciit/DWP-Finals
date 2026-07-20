import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { getGame } from '../../api/gamesApi'
import { ApiError } from '../../api/http'
import { listPublishedRetrospectives } from '../../api/retrospectivesApi'
import { game, pageOf, retrospective } from '../../test/publicFixtures'
import { GameDetailPage } from './GameDetailPage'

vi.mock('../../api/gamesApi', () => ({ getGame: vi.fn() }))
vi.mock('../../api/retrospectivesApi', () => ({ listPublishedRetrospectives: vi.fn() }))

function renderPage() { return render(<MemoryRouter initialEntries={['/games/game-1']}><Routes><Route path="/games/:gameId" element={<GameDetailPage />} /></Routes></MemoryRouter>) }

it('renders game and independently loaded related stories', async () => {
  vi.mocked(getGame).mockResolvedValue(game)
  vi.mocked(listPublishedRetrospectives).mockResolvedValue(pageOf([retrospective], 1, 9))
  renderPage()
  expect(await screen.findByRole('heading', { name: game.title })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: retrospective.title })).toBeInTheDocument()
})

it('shows not found without exposing details', async () => {
  vi.mocked(getGame).mockRejectedValue(new ApiError(404, { title: 'Not found' }))
  vi.mocked(listPublishedRetrospectives).mockResolvedValue(pageOf([]))
  renderPage()
  expect(await screen.findByRole('heading', { name: 'Game not found' })).toBeInTheDocument()
})

it('retains game content when the related list fails', async () => {
  vi.mocked(getGame).mockResolvedValue(game)
  vi.mocked(listPublishedRetrospectives).mockRejectedValue(new Error('Related unavailable'))
  renderPage()
  expect(await screen.findByRole('heading', { name: game.title })).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('Related unavailable')
})

it('pages the related list through the URL-owned query', async () => {
  vi.mocked(getGame).mockResolvedValue(game)
  vi.mocked(listPublishedRetrospectives).mockResolvedValue({ items: [retrospective], page: 1, pageSize: 9, totalCount: 20 })
  renderPage()
  await screen.findByRole('heading', { name: game.title })
  await userEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(listPublishedRetrospectives).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }), expect.any(AbortSignal))
})
