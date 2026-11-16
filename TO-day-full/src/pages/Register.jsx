import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { EyeIcon } from './Login'
import './pages.css'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { register } = useAuth()
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await register({ name, email, password })
      nav('/profile')
    } catch (err) {
      setError(err.message || 'Gagal mendaftar. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-screen">
      <Link to="/" className="back-home">← Beranda</Link>
      <h1 className="auth-title">Halo, Pejuang PTN!</h1>
      <p className="auth-sub">Buat akun gratis untuk mulai berlatih</p>

      <div className="auth-card">
        <h2>Register</h2>
        {error && <div className="error" role="alert">{error}</div>}
        <form onSubmit={submit} className="auth-form">
          <input placeholder="Nama lengkap" aria-label="Nama lengkap" value={name} onChange={e => setName(e.target.value)} required />
          <input type="email" placeholder="Email" aria-label="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <div className="field-wrap">
            <input type={show ? 'text' : 'password'} placeholder="Password" aria-label="Password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} required />
            <button type="button" className="eye" onClick={() => setShow(s => !s)} aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}>
              <EyeIcon off={!show} />
            </button>
          </div>
          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={submitting}>
            {submitting ? 'Memproses...' : 'Daftar'}
          </button>
        </form>
        <p className="switch">Sudah punya akun? <Link to="/login">Login</Link></p>
      </div>
    </div>
  )
}
