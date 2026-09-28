import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './pages.css'

export function EyeIcon({ off }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login({ email, password })
      nav('/profile')
    } catch (err) {
      setError('Email atau password salah. Untuk demo, gunakan akun yang tertera di bawah.')
    }
  }

  return (
    <div className="auth-screen">
      <Link to="/" className="back-home">← Beranda</Link>
      <h1 className="auth-title">Welcome Back!</h1>
      <p className="auth-sub">Masuk ke akun Anda</p>

      <div className="auth-card">
        <h2>Login</h2>
        {error && <div className="error" role="alert">{error}</div>}
        <form onSubmit={submit} className="auth-form">
          <input type="email" placeholder="Email" aria-label="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <div className="field-wrap">
            <input type={show ? 'text' : 'password'} placeholder="Password" aria-label="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            <button type="button" className="eye" onClick={() => setShow(s => !s)} aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}>
              <EyeIcon off={!show} />
            </button>
          </div>
          <a href="#lupa" className="forgot" onClick={e => e.preventDefault()}>Lupa Password?</a>
          <button className="btn btn-primary btn-block btn-lg" type="submit">Login</button>
        </form>
        <p className="switch">Belum punya akun? <Link to="/register">Register</Link></p>
      </div>

      <button type="button" className="demo-hint" onClick={() => { setEmail('johndoe@gmail.com'); setPassword('pass1234') }}>
        Akun demo: johndoe@gmail.com / pass1234. Ketuk untuk mengisi otomatis.
      </button>
    </div>
  )
}
