import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import UpgradeModal from '../components/UpgradeModal'
import { getStats } from '../api/tryouts'
import { apiErrorMessage } from '../api/client'
import './pages.css'

export default function Stats() {
  const { user, refreshUser } = useAuth()
  const [range, setRange] = useState(7)
  const [sel, setSel] = useState(null)
  const [modal, setModal] = useState(false)
  const [stats, setStats] = useState(null)
  const [state, setState] = useState('loading') // 'loading' | 'ready' | 'error'
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getStats()
      .then(data => { if (active) { setStats(data); setState('ready') } })
      .catch(err => { if (active) { setError(apiErrorMessage(err, 'Gagal memuat statistik.')); setState('error') } })
    return () => { active = false }
  }, [])

  if (state === 'loading') return <div className="page-wrap"><p className="hint">Memuat statistik...</p></div>
  if (state === 'error') return <div className="page-wrap"><div className="error" role="alert">{error}</div></div>

  const { daily, mastery, totalSessions } = stats
  const data = daily.slice(-range)
  const max = Math.max(...data.map(d => d.sessions), 1)
  const active = sel !== null && data[sel] ? data[sel] : data[data.length - 1]
  const totalInRange = data.reduce((s, d) => s + d.sessions, 0)
  const streakFromEnd = [...data].reverse().findIndex(d => d.sessions === 0)
  const target = Number(user.passing) || 0

  const masteryWithData = mastery.filter(m => m.hasData)
  // Perkiraan skor hanya bisa dihitung jika sudah ada data penguasaan dari minimal satu attempt.
  const est = masteryWithData.length
    ? Math.round(200 + (masteryWithData.reduce((s, m) => s + m.value, 0) / masteryWithData.length) * 8)
    : null
  const weak = [...masteryWithData].sort((a, b) => a.value - b.value)
  const pro = user.isPremium

  const onPaid = async () => {
    await refreshUser()
    try { setStats(await getStats()) } catch { /* biarkan data lama jika refresh gagal */ }
    setModal(false)
  }

  return (
    <div className="page-wrap">
      <div className="page-head">
        <h1>Statistik belajar</h1>
        <p>Pantau progres harian dan lihat subtes mana yang perlu diperkuat.</p>
      </div>

      <div className="kpis">
        <div className="glass-card kpi"><span>Total sesi latihan</span><strong>{totalSessions}</strong></div>
        <div className="glass-card kpi"><span>Sesi ({range} hari terakhir)</span><strong>{totalInRange}</strong></div>
        <div className="glass-card kpi"><span>Perkiraan skor</span><strong>{est ?? '-'}</strong></div>
      </div>

      {data.length === 0 ? (
        <section className="glass-card panel">
          <h2>Progres harian</h2>
          <p className="hint">Belum ada data latihan. Kerjakan tryout pertamamu untuk mulai melihat progres di sini.</p>
          <Link to="/tryouts" className="btn btn-primary">Pilih tryout</Link>
        </section>
      ) : (
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
                <span className="label">{new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
              </button>
            ))}
          </div>
          {active && (
            <p className="detail">
              <strong>{new Date(active.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}</strong>: {active.sessions ? `${active.sessions} sesi latihan, skor rata-rata ${active.avg}.` : 'Belum ada latihan di hari ini.'}
            </p>
          )}
          {streakFromEnd === 0 && <p className="hint">Belum ada latihan hari ini.</p>}
        </section>
      )}

      <div className="two-col">
        <section className="glass-card panel">
          <h2>Penguasaan subtes</h2>
          {masteryWithData.length === 0 ? (
            <p className="hint">Belum ada data. Kerjakan tryout dari tiap subtes untuk melihat penguasaanmu.</p>
          ) : (
            <>
              <div className="mastery">
                {mastery.map(m => (
                  <div key={m.code}>
                    <div className="m-row"><span>{m.name}</span><strong>{m.hasData ? `${m.value}%` : '-'}</strong></div>
                    <div className="track"><span className={m.hasData && m.value < 60 ? 'low' : ''} style={{ width: `${m.hasData ? m.value : 0}%` }} /></div>
                  </div>
                ))}
              </div>
              {weak.length >= 2 && <p className="hint">Perlu dilatih lebih dulu: {weak[0].name} dan {weak[1].name}.</p>}
            </>
          )}
        </section>

        <section className={`glass-card panel gate ${pro ? '' : 'gate-locked'}`}>
          <h2>Jarak ke passing grade</h2>
          <div className="gate-body">
            {est === null ? (
              <p className="big">Kerjakan tryout dulu untuk melihat perkiraan skor</p>
            ) : (
              <>
                <p className="big">{target ? (est >= target ? 'Sudah memenuhi' : `Kurang ${target - est} poin`) : 'Target belum diisi'}</p>
                <div className="track"><span style={{ width: `${target ? Math.min((est / target) * 100, 100) : 0}%` }} /></div>
                <p className="hint">Perkiraan {est} dari target {target || '...'}. {target ? (weak[0] && <>Fokus di {weak[0].name} untuk mengejar selisihnya.</>) : <Link to="/profile">Isi target di profil.</Link>}</p>
              </>
            )}
          </div>
          {!pro && (
            <div className="chat-lock">
              <p>Analisis passing grade khusus Premium.</p>
              <button className="btn btn-primary" onClick={() => setModal(true)}>Buka Premium</button>
            </div>
          )}
        </section>
      </div>
      {modal && <UpgradeModal onClose={() => setModal(false)} onPaid={onPaid} />}
    </div>
  )
}
