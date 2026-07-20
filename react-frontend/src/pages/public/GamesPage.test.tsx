import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { listGames } from '../../api/gamesApi'
import { game, pageOf } from '../../test/publicFixtures'
import { GamesPage } from './GamesPage'

vi.mock('../../api/gamesApi', () => ({ listGames: vi.fn() }))

function Location() { const navigate = useNavigate(); return <><output>{useLocation().search}</output><button onClick={() => navigate(-1)}>Back</button></> }
function renderPage(entry = '/games') {
  return render(<MemoryRouter initialEntries={[entry]}><Routes><Route path="/games" element={<><GamesPage /><Location /></>} /></Routes></MemoryRouter>)
}

it('restores valid URL query and falls back from invalid page/window', async () => {
  vi.mocked(listGames).mockResolvedValue(pageOf([game]))
  renderPage('/games?search=control&releaseWindow=bad&page=-2')
  expect(await screen.findByRole('heading', { name: game.title })).toBeInTheDocument()
  expect(listGames).toHaveBeenCalledWith(expect.objectContaining({ search: 'control', releaseWindow: 'all', page: 1 }), expect.any(AbortSignal))
})

it('writes search to the URL and resets the page', async () => {
  vi.mocked(listGames).mockResolvedValue(pageOf([game]))
  renderPage('/games?page=4')
  await screen.findByRole('heading', { name: game.title })
  await userEvent.type(screen.getByLabelText('Search games'), 'outer wilds')
  await userEvent.click(screen.getByRole('button', { name: 'Search' }))
  await waitFor(() => expect(screen.getByText('?search=outer+wilds')).toBeInTheDocument())
  await userEvent.click(screen.getByRole('button', { name: 'Back' }))
  await waitFor(() => expect(screen.getByText('?page=4')).toBeInTheDocument())
  expect(screen.getByLabelText('Search games')).toHaveValue('')
})

it('shows a recoverable empty state for extreme pages', async () => {
  vi.mocked(listGames).mockResolvedValue({ items: [], page: 999999, pageSize: 12, totalCount: 2 })
  renderPage('/games?page=999999')
  expect(await screen.findByRole('heading', { name: 'No games found' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
})

it('cancels its request when the page unmounts', () => {
  vi.mocked(listGames).mockReturnValue(new Promise(() => undefined))
  const view = renderPage()
  const signal = vi.mocked(listGames).mock.calls[0][1]!
  view.unmount()
  expect(signal.aborted).toBe(true)
})
