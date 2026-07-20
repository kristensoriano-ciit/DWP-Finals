import { Link } from 'react-router-dom'

export function ForbiddenPage() {
  return <section className="page-message"><p className="eyebrow">Access denied</p><h1>You cannot open this page</h1><p>Your account does not have the required role.</p><Link className="button-link" to="/">Return home</Link></section>
}
