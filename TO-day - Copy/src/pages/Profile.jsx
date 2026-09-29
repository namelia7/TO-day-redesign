import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import UpgradeModal from '../components/UpgradeModal'
import { PASSING } from '../data/mockQuestions'
import './pages.css'

export default function Profile() {
  const { user, updateUser, upgrade } = useAuth()
  const [school, setSchool] = useState(user.school || '')
  const [ptn, setPtn] = useState(user.ptn || '')
  const [prodi, setProdi] = useState(user.prodi || '')
  const [passing, setPassing] = useState(user.passing || '')
  const [saved, setSaved] = useState(false)
  const [modal, setModal] = useState(false)

  const pickPtn = (v) => { setPtn(v); setProdi(''); setPassing('') }
  const pickProdi = (v) => { setProdi(v); setPassing(String(PASSING[ptn]?.[v] ?? '')) }
  const save = (e) => {
    e.preventDefault()
    updateUser({ school, ptn, prodi, passing })
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  return (
    <div className="page-wrap">
      <div className="page-head">
        <h1>Halo, {user.name}</h1>
        <p>Atur tujuanmu supaya statistik bisa membandingkan skormu dengan passing grade.</p>
      </div>

      <div className="two-col">
        <form className="glass-card panel" onSubmit={save}>
          <h2>Data siswa</h2>
          <label htmlFor="school">Sekolah asal</label>
          <input id="school" value={school} onChange={e => setSchool(e.target.value)} placeholder="Contoh: SMA Negeri 1 Jakarta" />
          <label htmlFor="ptn">PTN tujuan</label>
          <select id="ptn" value={ptn} onChange={e => pickPtn(e.target.value)}>
            <option value="">Pilih PTN</option>
            {Object.keys(PASSING).map(p => <option key={p}>{p}</option>)}
          </select>
          <label htmlFor="prodi">Program studi</label>
          <select id="prodi" value={prodi} onChange={e => pickProdi(e.target.value)} disabled={!ptn}>
            <option value="">Pilih prodi</option>
            {ptn && Object.keys(PASSING[ptn]).map(p => <option key={p}>{p}</option>)}
          </select>
          <label htmlFor="pg">Passing grade target</label>
          <input id="pg" type="number" value={passing} onChange={e => setPassing(e.target.value)} placeholder="Terisi otomatis saat prodi dipilih" />
          <p className="hint">Data passing grade di sini hanya contoh untuk demo.</p>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit">Simpan profil</button>
            {saved && <span className="saved" role="status">Profil tersimpan</span>}
          </div>
        </form>

        <div className="stack">
          <section className="glass-card panel">
            <h2>Status akun</h2>
            <div className={`plan ${user.isPremium ? 'plan-on' : ''}`}>{user.isPremium ? 'Premium aktif' : 'Paket Gratis'}</div>
            {user.isPremium ? (
              <p className="hint">Semua tryout, pembahasan, Tanya AI, dan leaderboard sudah terbuka. Pembayaran terakhir lewat {user.payMethod || 'QRIS'} (simulasi).</p>
            ) : (
              <>
                <p className="hint">Upgrade Rp 19.000 per bulan untuk membuka semua fitur.</p>
                <button className="btn btn-primary" onClick={() => setModal(true)}>Upgrade ke Premium</button>
              </>
            )}
          </section>
          <section className="glass-card panel">
            <h2>Mulai berlatih</h2>
            <div className="quick-actions">
              <Link className="btn btn-primary" to="/tryouts">Pilih tryout</Link>
              <Link className="btn btn-glass" to="/stats">Statistik</Link>
              <Link className="btn btn-glass" to="/results">Hasil terakhir</Link>
            </div>
          </section>
        </div>
      </div>

      <UpgradeModal open={modal} onClose={() => setModal(false)} onConfirm={(m) => { upgrade(); updateUser({ payMethod: m }); setModal(false) }} />
    </div>
  )
}
