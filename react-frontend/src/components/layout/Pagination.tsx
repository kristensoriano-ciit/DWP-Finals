type PaginationProps = {
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, pageSize, totalCount, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  if (totalCount <= pageSize && page <= 1) return null

  const first = Math.max(1, Math.min(page - 2, totalPages - 4))
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => first + index)

  return <nav className="pagination" aria-label="Pagination">
    <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
    {pages.map((value) => <button type="button" key={value} aria-current={value === page ? 'page' : undefined} onClick={() => onPageChange(value)}>{value}</button>)}
    <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
  </nav>
}
