import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { EyeIcon } from './Login'
import './pages.css'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const { register } = useAuth()
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    await register({ name, email })
    nav('/profile')
  }

  return (
    <div className="auth-screen">
      <Link to="/" className="back-home">← Beranda</Link>
      <h1 className="auth-title">Halo, Pejuang PTN!</h1>
      <p className="auth-sub">Buat akun gratis untuk mulai berlatih</p>

      <div className="auth-card">
        <h2>Register</h2>
        <form onSubmit={submit} className="auth-form">
          <input placeholder="Nama lengkap" aria-label="Nama lengkap" value={name} onChange={e => setName(e.target.value)} required />
          <input type="email" placeholder="Email" aria-label="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <div className="field-wrap">
            <input type={show ? 'text' : 'password'} placeholder="Password" aria-label="Password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} required />
            <button type="button" className="eye" onClick={() => setShow(s => !s)} aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}>
              <EyeIcon off={!show} />
            </button>
          </div>
          <button className="btn btn-primary btn-block btn-lg" type="submit">Daftar</button>
        </form>
        <p className="switch">Sudah punya akun? <Link to="/login">Login</Link></p>
      </div>
    </div>
  )
}
