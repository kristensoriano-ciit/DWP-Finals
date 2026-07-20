import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pagination } from './Pagination'

it('marks the current page and supports bounded keyboard activation', async () => {
  const onPageChange = vi.fn()
  render(<Pagination page={2} pageSize={10} totalCount={25} onPageChange={onPageChange} />)
  expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page')
  await userEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(onPageChange).toHaveBeenCalledWith(3)
})

it('disables unavailable directions', () => {
  const { rerender } = render(<Pagination page={1} pageSize={10} totalCount={20} onPageChange={vi.fn()} />)
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
  rerender(<Pagination page={2} pageSize={10} totalCount={20} onPageChange={vi.fn()} />)
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
})
