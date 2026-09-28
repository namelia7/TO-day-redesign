import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './pages.css'

export default function Profile() {
  const { user, logout } = useAuth()
  const [school, setSchool] = useState(user?.school || '')
  const [target, setTarget] = useState(user?.target || '')
  const [passing, setPassing] = useState(user?.passing || '')
  const [isPremium, setPremium] = useState(user?.isPremium || false)

  const save = () => {
    // demo: store in localStorage or update context (skip complexity)
    alert('Profil tersimpan (demo)')
  }

  return (
    <div className="page profile glass">
      <h2>Profil Siswa</h2>
      <div className="quick-actions">
        <a className="btn btn-glass" href="/tryouts">Mulai Tryout</a>
        <a className="btn btn-glass" href="/stats">Lihat Statistik</a>
        <a className="btn btn-glass" href="/results">Hasil Saya</a>
      </div>
      <div className="profile-grid">
        <div>
          <label>Sekolah Asal</label>
          <input value={school} onChange={e => setSchool(e.target.value)} />
          <label>Tujuan PTN / Prodi</label>
          <input value={target} onChange={e => setTarget(e.target.value)} />
          <label>Passing Grade Target</label>
          <input value={passing} onChange={e => setPassing(e.target.value)} />
        </div>
        <div>
          <label>Status Akun</label>
          <div className="status">{isPremium ? 'Premium' : 'Gratis'}</div>
          <button className="btn" onClick={() => setPremium(p => !p)}>Toggle Premium (demo)</button>
          <div className="payment">
            <h4>Pembayaran</h4>
            <p>Metode: Demo payment (tidak nyata)</p>
          </div>
          <button className="btn" onClick={logout}>Logout</button>
        </div>
      </div>
      <div className="actions">
        <button className="btn btn-primary" onClick={save}>Simpan</button>
      </div>
    </div>
  )
}
