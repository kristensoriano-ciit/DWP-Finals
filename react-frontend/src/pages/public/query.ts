export function positivePage(value: string | null) {
  const page = Number(value)
  return Number.isSafeInteger(page) && page > 0 ? page : 1
}

export function updateQuery(current: URLSearchParams, changes: Record<string, string | number | undefined>) {
  const next = new URLSearchParams(current)
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || value === '' || value === 1 || value === 'all' || value === 'newest') next.delete(key)
    else next.set(key, String(value))
  }
  return next
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The service is unavailable. Please try again.'
}
