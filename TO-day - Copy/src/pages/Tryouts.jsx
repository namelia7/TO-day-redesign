import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import UpgradeModal from '../components/UpgradeModal'
import { TRYOUTS, questionsFor } from '../data/mockQuestions'
import './pages.css'

const TABS = [['all', 'Semua'], ['utbk', 'Simulasi UTBK'], ['subtest', 'Kuis per subtes']]

export default function Tryouts() {
  const { user, upgrade, updateUser } = useAuth()
  const [tab, setTab] = useState('all')
  const [modal, setModal] = useState(false)
  const list = TRYOUTS.filter(t => tab === 'all' || t.type === tab)

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
              <p className="meta">{questionsFor(t).length} soal, {Math.floor(t.duration / 60)} menit</p>
              {locked
                ? <button className="btn btn-glass btn-block" onClick={() => setModal(true)}>Buka dengan Premium</button>
                : <Link to={`/tryouts/${t.id}`} className="btn btn-primary btn-block">Mulai</Link>}
            </article>
          )
        })}
      </div>
      <UpgradeModal open={modal} onClose={() => setModal(false)} onConfirm={(m) => { upgrade(); updateUser({ payMethod: m }); setModal(false) }} />
    </div>
  )
}
