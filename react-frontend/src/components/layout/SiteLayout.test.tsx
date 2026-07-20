import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import type { User } from '../../api/types'
import { SiteLayout } from './SiteLayout'

const author: User = { id: '1', displayName: 'Ada', email: 'a@b.test', role: 'Author', isActive: true, createdAtUtc: '', deactivatedAtUtc: null }

function renderLayout(user?: User) {
  const router = createMemoryRouter([{ path: '/', element: <SiteLayout user={user} />, children: [{ index: true, element: <p>Page</p> }] }])
  return render(<RouterProvider router={router} />)
}

it('opens the mobile menu, moves focus, and closes with Escape', async () => {
  renderLayout()
  await userEvent.click(screen.getByRole('button', { name: 'Menu' }))
  expect(screen.getByRole('link', { name: 'Home' })).toHaveFocus()
  await userEvent.keyboard('{Escape}')
  expect(screen.getByRole('button', { name: 'Menu' })).toHaveFocus()
})

it('shows anonymous, Author, and Admin links by role', () => {
  const view = renderLayout()
  expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument()
  view.unmount()
  renderLayout(author)
  expect(screen.getByRole('link', { name: 'My Retrospectives' })).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument()
  cleanup()
  renderLayout({ ...author, role: 'Admin' })
  expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Manage Users' })).toHaveAttribute('href', '/admin/users')
})
