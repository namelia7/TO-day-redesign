import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/useAuth'
import UpgradeModal from '../components/UpgradeModal'
import { listTryouts } from '../api/tryouts'
import { apiErrorMessage } from '../api/client'
import './pages.css'

const TABS = [['all', 'Semua'], ['utbk', 'Simulasi UTBK'], ['subtest', 'Kuis per subtes']]

export default function Tryouts() {
  const { user, refreshUser } = useAuth()
  const [tab, setTab] = useState('all')
  const [modal, setModal] = useState(false)
  const [tryouts, setTryouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    listTryouts()
      .then(data => { if (active) setTryouts(data) })
      .catch(err => { if (active) setError(apiErrorMessage(err, 'Gagal memuat daftar tryout.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const list = tryouts.filter(t => tab === 'all' || t.type === tab)

  return (
    <div className="page-wrap">
      <div className="page-head">
        <h1>Pilih tryout</h1>
        <p>Simulasi UTBK terasa seperti ujian asli. Kuis per subtes cocok untuk latihan singkat.</p>
      </div>
      <div className="tabs" role="tablist">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {loading && <p className="hint">Memuat daftar tryout...</p>}
      {error && <div className="error" role="alert">{error}</div>}

      {!loading && !error && (
        <div className="card-grid">
          {list.map(t => {
            const locked = t.premium && !user.isPremium
            return (
              <article key={t.id} className={`glass-card tryout-card ${locked ? 'is-locked' : ''}`}>
                <div className="tc-tags">
                  <span className="badge">{t.type === 'utbk' ? 'Mirip UTBK' : 'Kuis subtes'}</span>
                  <span className={`badge ${t.premium ? 'badge-pro' : 'badge-free'}`}>{t.premium ? 'Premium' : 'Gratis'}</span>
                </div>
                <h3>{t.title}</h3>
                <p>{t.desc}</p>
                <p className="meta">{t.questionCount} soal, {Math.floor(t.duration / 60)} menit</p>
                {locked
                  ? <button className="btn btn-glass btn-block" onClick={() => setModal(true)}>Buka dengan Premium</button>
                  : <Link to={`/tryouts/${t.id}`} className="btn btn-primary btn-block">Mulai</Link>}
              </article>
            )
          })}
        </div>
      )}

      <UpgradeModal open={modal} onClose={() => setModal(false)} onPaid={async () => { await refreshUser(); setModal(false) }} />
    </div>
  )
}
