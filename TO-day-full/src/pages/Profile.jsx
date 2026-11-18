import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import UpgradeModal from '../components/UpgradeModal'
import { getPaymentHistory, getPaymentInfo, getPaymentStatus } from '../api/payments'
import { PASSING } from '../data/referenceData'
import './pages.css'

function formatRupiah(value) {
  return `Rp ${Number(value).toLocaleString('id-ID')}`
}

function paymentStatusLabel(status) {
  if (status === 'paid') return 'Aktif'
  if (status === 'pending') return 'Menunggu verifikasi'
  return 'Gagal/kedaluwarsa'
}

export default function Profile() {
  const { user, updateUser, refreshUser } = useAuth()
  const [school, setSchool] = useState(user.school || '')
  const [ptn, setPtn] = useState(user.ptn || '')
  const [prodi, setProdi] = useState(user.prodi || '')
  const [passing, setPassing] = useState(user.passing || '')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(false)
  const [pending, setPending] = useState(null)
  const [history, setHistory] = useState([])
  const [checking, setChecking] = useState(false)
  const [payMsg, setPayMsg] = useState('')

  const loadPayments = async () => {
    try {
      const [info, hist] = await Promise.all([getPaymentInfo(), getPaymentHistory()])
      setPending(info.pending || null)
      setHistory(hist.payments || [])
    } catch {
      // Diamkan: bagian pembayaran opsional, jangan ganggu halaman profil.
    }
  }

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [info, hist] = await Promise.all([getPaymentInfo(), getPaymentHistory()])
        if (!active) return
        setPending(info.pending || null)
        setHistory(hist.payments || [])
      } catch {
        // abaikan
      }
    }
    load()
    return () => { active = false }
  }, [])

  const checkPayment = async () => {
    if (!pending) return
    setChecking(true)
    setPayMsg('')
    try {
      const data = await getPaymentStatus(pending.paymentId)
      if (data.status === 'paid') {
        await refreshUser()
        setPending(null)
        setPayMsg('Pembayaran terverifikasi. Premium sudah aktif.')
        await loadPayments()
      } else if (data.status === 'failed') {
        setPending(null)
        setPayMsg('Pembayaran ditolak atau kedaluwarsa. Silakan buat order baru.')
        await loadPayments()
      } else {
        setPayMsg('Pembayaran masih menunggu verifikasi admin.')
      }
    } catch {
      setPayMsg('Gagal mengecek status. Coba lagi.')
    } finally {
      setChecking(false)
    }
  }

  const pickPtn = (v) => { setPtn(v); setProdi(''); setPassing('') }
  const pickProdi = (v) => { setProdi(v); setPassing(String(PASSING[ptn]?.[v] ?? '')) }

  const save = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await updateUser({ school, ptn, prodi, passing })
      setSaved(true)
      setTimeout(() => setSaved(false), 2200)
    } catch {
      setError('Gagal menyimpan profil. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-wrap">
      <div className="page-head">
        <h1>Halo, {user.name}</h1>
        <p className="hint">Username leaderboard: <strong>@{user.username || user.name}</strong></p>
        <p>Atur tujuanmu supaya statistik bisa membandingkan skormu dengan passing grade.</p>
      </div>

      {pending && (
        <div className="pending-banner glass-card">
          <div>
            <strong>Pembayaran menunggu verifikasi</strong>
            <p className="hint">
              Order {pending.orderId} • {formatRupiah(pending.amount)}. Kirim bukti pembayaran via WhatsApp jika belum.
            </p>
          </div>
          <div className="pending-actions">
            <button className="btn btn-glass" onClick={checkPayment} disabled={checking}>
              {checking ? 'Mengecek...' : 'Cek Status'}
            </button>
            {pending.whatsappUrl && (
              <a className="btn btn-primary" href={pending.whatsappUrl} target="_blank" rel="noreferrer">
                Buka WhatsApp
              </a>
            )}
          </div>
        </div>
      )}
      {payMsg && <p className="hint pay-msg" role="status">{payMsg}</p>}

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
          <p className="hint">Data passing grade di sini hanya contoh referensi, bukan data resmi SNPMB.</p>
          {error && <div className="error" role="alert">{error}</div>}
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan profil'}</button>
            {saved && <span className="saved" role="status">Profil tersimpan</span>}
          </div>
        </form>

        <div className="stack">
          <section className="glass-card panel">
            <h2>Status akun</h2>
            <div className={`plan ${user.isPremium ? 'plan-on' : ''}`}>{user.isPremium ? 'Premium aktif' : 'Paket Gratis'}</div>
            {user.isPremium ? (
              <p className="hint">
                Semua tryout, pembahasan, Tanya AI, dan leaderboard sudah terbuka.
                {user.premiumUntil && <> Berlaku sampai {new Date(user.premiumUntil).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.</>}
              </p>
            ) : (
              <>
                <p className="hint">Upgrade Rp 40.000 per bulan untuk membuka semua fitur.</p>
                <button className="btn btn-primary" onClick={() => setModal(true)}>Upgrade ke Premium</button>
              </>
            )}
          </section>
          <section className="glass-card panel">
            <h2>Riwayat pembayaran</h2>
            {history.length === 0 ? (
              <p className="hint">Belum ada pembayaran.</p>
            ) : (
              <ul className="pay-history">
                {history.slice(0, 5).map(p => (
                  <li key={p.id}>
                    <div>
                      <strong>{formatRupiah(p.amount)}</strong>
                      <span>{p.method || 'Pembayaran'}</span>
                    </div>
                    <span className={`pay-status ${p.status}`}>{paymentStatusLabel(p.status)}</span>
                  </li>
                ))}
              </ul>
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

      {modal && (
        <UpgradeModal
          onClose={() => setModal(false)}
          onPaid={async () => {
            await refreshUser()
            await loadPayments()
            setModal(false)
          }}
        />
      )}
    </div>
  )
}
