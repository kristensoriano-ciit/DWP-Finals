import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return <section className="page-message"><p className="eyebrow">404</p><h1>Page not found</h1><p>The page may have moved or is no longer available.</p><Link className="button-link" to="/">Return home</Link></section>
}
