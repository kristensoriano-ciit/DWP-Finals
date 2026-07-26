import { Link } from 'react-router-dom'
import { DashboardPanels } from '../../components/dashboard/DashboardPanels'

export function AdminPage() {
  return <section className="admin-overview"><header className="page-heading"><p className="eyebrow">Administration</p><h1>Admin</h1><p>Keep the Checkpoint catalog accurate and access controlled.</p></header><div className="admin-overview__grid"><article><p className="eyebrow">Catalog</p><h2>Games</h2><p>Create, update, search, filter, and archive the active game catalog.</p><Link className="button-link" to="/admin/games">Manage games</Link></article><article><p className="eyebrow">Access</p><h2>Users</h2><p>Review roles and deactivate accounts that should no longer have access.</p><Link className="button-link" to="/admin/users">Manage users</Link></article></div><DashboardPanels /></section>
}
