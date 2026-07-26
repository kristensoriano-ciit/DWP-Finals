import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AdminPage } from './AdminPage'

vi.mock('../../components/dashboard/DashboardPanels', () => ({ DashboardPanels: () => <div data-testid="dashboard-panels" /> }))

it('composes catalog administration with the public dashboard panels', () => {
  render(<MemoryRouter><AdminPage /></MemoryRouter>)

  expect(screen.getByRole('heading', { name: 'Admin' })).toBeInTheDocument()
  expect(screen.getByTestId('dashboard-panels')).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /my retrospectives/i })).not.toBeInTheDocument()
})
