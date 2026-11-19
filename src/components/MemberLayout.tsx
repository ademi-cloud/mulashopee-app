import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import Logo from './Logo'

export default function MemberLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const tabs = [
    ...(profile?.is_admin ? [{ to: '/admin', label: 'Dashboard' }] : []),
    { to: '/ahli', label: 'Utama', end: true },
    { to: '/ahli/video', label: 'Video' },
    { to: '/ahli/ebook', label: 'Ebook' },
  ]

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-row">
          <Logo to="/ahli" />
          <div className="topbar-actions">
            <NavLink to="/ahli" className="btn btn-outline btn-sm">Ruang Ahli</NavLink>
            <button
              className="btn-link"
              onClick={async () => {
                await signOut()
                navigate('/')
              }}
            >
              Keluar
            </button>
          </div>
        </div>
        <nav className="tabs">
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
              {t.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  )
}
