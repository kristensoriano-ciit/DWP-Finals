import type { UserRole } from '../api/types'

const publicPaths = ['/', '/games', '/retrospectives', '/account']

function pathIsWithin(pathname: string, root: string) {
  return pathname === root || (root !== '/' && pathname.startsWith(`${root}/`))
}

export function safeReturnPath(value: unknown, role: UserRole): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/'

  let decoded: string
  try {
    decoded = decodeURIComponent(value)
  } catch {
    return '/'
  }
  if (decoded.startsWith('//') || decoded.includes('\\')) return '/'

  let url: URL
  try {
    url = new URL(value, 'https://checkpoint.local')
  } catch {
    return '/'
  }
  if (url.origin !== 'https://checkpoint.local') return '/'

  const allowed = publicPaths.some((root) => pathIsWithin(url.pathname, root))
    || (role === 'Author' && pathIsWithin(url.pathname, '/dashboard/retrospectives'))
    || (role === 'Admin' && pathIsWithin(url.pathname, '/admin'))
  return allowed ? `${url.pathname}${url.search}${url.hash}` : '/'
}
