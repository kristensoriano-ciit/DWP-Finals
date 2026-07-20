import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { listAllGames } from '../../api/gamesApi'
import { listPublishedRetrospectives } from '../../api/retrospectivesApi'
import { game, pageOf, retrospective } from '../../test/publicFixtures'
import { RetrospectivesPage } from './RetrospectivesPage'

vi.mock('../../api/gamesApi', () => ({ listAllGames: vi.fn() }))
vi.mock('../../api/retrospectivesApi', () => ({ listPublishedRetrospectives: vi.fn() }))

function Location() { return <output>{useLocation().search}</output> }
function renderPage(entry = '/retrospectives') { return render(<MemoryRouter initialEntries={[entry]}><Routes><Route path="/retrospectives" element={<><RetrospectivesPage /><Location /></>} /></Routes></MemoryRouter>) }

beforeEach(() => {
  vi.mocked(listAllGames).mockResolvedValue([game])
  vi.mocked(listPublishedRetrospectives).mockResolvedValue(pageOf([retrospective]))
})

it('restores search, game, best sorting and page from the URL', async () => {
  renderPage('/retrospectives?search=house&gameId=game-1&sort=best&page=3')
  await screen.findByRole('heading', { name: retrospective.title })
  expect(listPublishedRetrospectives).toHaveBeenCalledWith(expect.objectContaining({ search: 'house', gameId: 'game-1', sort: 'best', page: 3 }), expect.any(AbortSignal))
})

it('updates sort in the URL and resets paging', async () => {
  renderPage('/retrospectives?page=4')
  await screen.findByRole('heading', { name: retrospective.title })
  await userEvent.selectOptions(screen.getByLabelText('Sort'), 'best')
  await waitFor(() => expect(screen.getByText('?sort=best')).toBeInTheDocument())
})

it('shows a retryable service error', async () => {
  vi.mocked(listPublishedRetrospectives).mockRejectedValue(new Error('Portal unavailable'))
  renderPage()
  expect(await screen.findByRole('alert')).toHaveTextContent('Portal unavailable')
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
})

it('cancels both list requests when leaving the page', () => {
  vi.mocked(listAllGames).mockReturnValue(new Promise(() => undefined))
  vi.mocked(listPublishedRetrospectives).mockReturnValue(new Promise(() => undefined))
  const view = renderPage()
  const gamesSignal = vi.mocked(listAllGames).mock.calls[0][0]!
  const listSignal = vi.mocked(listPublishedRetrospectives).mock.calls[0][1]!
  view.unmount()
  expect(gamesSignal.aborted).toBe(true)
  expect(listSignal.aborted).toBe(true)
})

it('keeps retrospective results visible when game filters fail visibly', async () => {
  vi.mocked(listAllGames).mockRejectedValue(new Error('failed'))
  renderPage()
  expect(await screen.findByRole('heading', { name: retrospective.title })).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('Game filters could not be loaded')
})
