import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'
import '../pages/pages.css'

export default function Header() {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  // Halaman login dan register tampil bersih tanpa header
  if (pathname === '/login' || pathname === '/register') return null

  const close = () => setOpen(false)

  return (
    <header className="site-header">
      <div className="header-bar">
        <Link to={user ? '/profile' : '/'} className="brand" onClick={close}>
          <span className="brand-dot" />TO-Day
        </Link>

        <nav className={`nav ${open ? 'open' : ''}`} onClick={close}>
          {pathname === '/' && !user && (
            <>
              <a href="#fitur">Fitur</a>
              <a href="#paket">Paket</a>
              <a href="#testimoni">Testimoni</a>
            </>
          )}
          {user && (
            <>
              <Link to="/profile">Beranda</Link>
              <Link to="/tryouts">Tryout</Link>
              <Link to="/stats">Statistik</Link>
              <Link to="/results">Hasil</Link>
            </>
          )}
        </nav>

        <div className="auth-links">
          {user ? (
            <>
              <Link to="/profile" className="profile-pill">{user.name}</Link>
              <button className="btn btn-ghost" onClick={logout}>Keluar</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">Login</Link>
              <Link to="/register" className="btn btn-primary">Daftar</Link>
            </>
          )}
          <button className="hamburger" onClick={() => setOpen(o => !o)} aria-label="Buka menu" aria-expanded={open}>
            <span /><span /><span />
          </button>
        </div>
      </div>
    </header>
  )
}
