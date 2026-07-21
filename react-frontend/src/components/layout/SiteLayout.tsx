import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import type { User } from '../../api/types'
import { useOptionalSession } from '../../auth/useSession'

export function SiteLayout({ user = null }: { user?: User | null }) {
  const session = useOptionalSession()
  const activeUser = session?.user ?? user
  const isRestoring = session?.status === 'restoring'
  const [menuLocation, setMenuLocation] = useState<string | null>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const firstLinkRef = useRef<HTMLAnchorElement>(null)
  const location = useLocation()
  const locationKey = `${location.pathname}${location.search}`
  const isMenuOpen = menuLocation === locationKey

  useEffect(() => {
    if (isMenuOpen) firstLinkRef.current?.focus()
  }, [isMenuOpen])

  function closeMenu() {
    setMenuLocation(null)
    menuButtonRef.current?.focus()
  }

  function focusMainContent(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    document.getElementById('main-content')?.focus()
    window.history.replaceState(null, '', '#main-content')
  }

  return <div className="site-shell">
    <a className="skip-link" href="#main-content" onClick={focusMainContent}>Skip to content</a>
    <header className="site-header">
      <Link className="brand" to="/" aria-label="Checkpoint home"><span className="brand__mark" aria-hidden="true">C</span>CHECKPOINT</Link>
      <button ref={menuButtonRef} className="menu-button" type="button" aria-expanded={isMenuOpen} aria-controls="main-navigation" onClick={() => setMenuLocation(isMenuOpen ? null : locationKey)}>Menu</button>
      <nav id="main-navigation" className={isMenuOpen ? 'main-navigation main-navigation--open' : 'main-navigation'} aria-label="Main navigation" onKeyDown={(event) => { if (event.key === 'Escape') closeMenu() }}>
        <NavLink ref={firstLinkRef} to="/">Home</NavLink>
        <NavLink to="/games">Games</NavLink>
        <NavLink to="/retrospectives">Retrospectives</NavLink>
        {!activeUser && !isRestoring && <NavLink to="/login">Sign in</NavLink>}
        {!activeUser && !isRestoring && <NavLink to="/register">Register</NavLink>}
        {activeUser?.role === 'Author' && <NavLink to="/dashboard/retrospectives">My Retrospectives</NavLink>}
        {activeUser?.role === 'Admin' && <NavLink to="/admin">Admin</NavLink>}
        {activeUser?.role === 'Admin' && <NavLink to="/admin/games">Manage Games</NavLink>}
        {activeUser?.role === 'Admin' && <NavLink to="/admin/users">Manage Users</NavLink>}
        {activeUser && <NavLink to="/account">Account</NavLink>}
        {activeUser && session && <button className="navigation-action" type="button" onClick={session.signOut}>Sign out</button>}
      </nav>
    </header>
    <main id="main-content" tabIndex={-1}><Outlet /></main>
    <footer><Link className="brand brand--small" to="/">CHECKPOINT</Link><p>Games remembered with the benefit of time.</p><span>© 2026</span></footer>
  </div>
}
