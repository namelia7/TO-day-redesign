import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import UpgradeModal from '../components/UpgradeModal'
import { DAILY, MASTERY } from '../data/mockQuestions'
import './pages.css'

export default function Stats() {
  const { user, upgrade, updateUser } = useAuth()
  const [range, setRange] = useState(7)
  const [sel, setSel] = useState(null)
  const [modal, setModal] = useState(false)

  const data = DAILY.slice(-range)
  const max = Math.max(...data.map(d => d.sessions), 1)
  const active = sel !== null && data[sel] ? data[sel] : data[data.length - 1]
  const total = data.reduce((s, d) => s + d.sessions, 0)
  const streak = [...data].reverse().findIndex(d => d.sessions === 0)
  const target = Number(user.passing) || 0
  const est = Math.round(200 + (MASTERY.reduce((s, m) => s + m.value, 0) / MASTERY.length) * 8)
  const weak = [...MASTERY].sort((a, b) => a.value - b.value)
  const pro = user.isPremium

  return (
    <div className="page-wrap">
      <div className="page-head">
        <h1>Statistik belajar</h1>
        <p>Pantau progres harian dan lihat subtes mana yang perlu diperkuat.</p>
      </div>

      <div className="kpis">
        <div className="glass-card kpi"><span>Sesi latihan</span><strong>{total}</strong></div>
        <div className="glass-card kpi"><span>Hari beruntun</span><strong>{streak === -1 ? data.length : streak}</strong></div>
        <div className="glass-card kpi"><span>Perkiraan skor</span><strong>{est}</strong></div>
      </div>

      <section className="glass-card panel">
        <div className="panel-head">
          <h2>Progres harian</h2>
          <div className="tabs">
            {[7, 14].map(r => <button key={r} className={`tab ${range === r ? 'on' : ''}`} onClick={() => { setRange(r); setSel(null) }}>{r} hari</button>)}
          </div>
        </div>
        <div className="chart" role="group" aria-label="Sesi latihan per hari">
          {data.map((d, i) => (
            <button key={d.date} className={`col ${d === active ? 'on' : ''}`} onClick={() => setSel(i)} aria-label={`${d.date}: ${d.sessions} sesi`}>
              <span className="bar" style={{ height: `${Math.max((d.sessions / max) * 100, 4)}%` }} />
              <span className="label">{d.date}</span>
            </button>
          ))}
        </div>
        <p className="detail">
          <strong>{active.date}</strong>: {active.sessions ? `${active.sessions} sesi latihan, skor rata-rata ${active.avg}.` : 'Belum ada latihan di hari ini.'}
        </p>
      </section>

      <div className="two-col">
        <section className="glass-card panel">
          <h2>Penguasaan subtes</h2>
          <div className="mastery">
            {MASTERY.map(m => (
              <div key={m.name}>
                <div className="m-row"><span>{m.name}</span><strong>{m.value}%</strong></div>
                <div className="track"><span className={m.value < 60 ? 'low' : ''} style={{ width: `${m.value}%` }} /></div>
              </div>
            ))}
          </div>
          <p className="hint">Perlu dilatih lebih dulu: {weak[0].name} dan {weak[1].name}.</p>
        </section>

        <section className={`glass-card panel gate ${pro ? '' : 'gate-locked'}`}>
          <h2>Jarak ke passing grade</h2>
          <div className="gate-body">
            <p className="big">{target ? (est >= target ? 'Sudah memenuhi' : `Kurang ${target - est} poin`) : 'Target belum diisi'}</p>
            <div className="track"><span style={{ width: `${target ? Math.min((est / target) * 100, 100) : 0}%` }} /></div>
            <p className="hint">Perkiraan {est} dari target {target || '...'}. {target ? <>Fokus di {weak[0].name} untuk mengejar selisihnya.</> : <><Link to="/profile">Isi target di profil.</Link></>}</p>
          </div>
          {!pro && (
            <div className="chat-lock">
              <p>Analisis passing grade khusus Premium.</p>
              <button className="btn btn-primary" onClick={() => setModal(true)}>Buka Premium</button>
            </div>
          )}
        </section>
      </div>
      <UpgradeModal open={modal} onClose={() => setModal(false)} onConfirm={(m) => { upgrade(); updateUser({ payMethod: m }); setModal(false) }} />
    </div>
  )
}
