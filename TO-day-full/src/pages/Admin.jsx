import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { approvePayment, getAdminPayments, rejectPayment } from '../api/payments'
import { apiErrorMessage } from '../api/client'
import AdminQuestions from '../components/AdminQuestions'
import { useAuth } from '../context/useAuth'
import './pages.css'

function formatRupiah(value) {
  return `Rp ${Number(value).toLocaleString('id-ID')}`
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

// Halaman verifikasi pembayaran manual. Akses memakai akun user dengan
// is_admin = true; ADMIN_TOKEN tetap tersedia sebagai fallback API.
export default function Admin() {
  const { user, loading: authLoading, logout } = useAuth()
  const [payments, setPayments] = useState([])
  const [status, setStatus] = useState('pending')
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [notes, setNotes] = useState({})
  const [view, setView] = useState('payments')

  const isAdmin = !!user?.isAdmin

  const load = useCallback(async (filter) => {
    if (!isAdmin) return
    setLoading(true)
    setError('')
    try {
      const data = await getAdminPayments(filter)
      setPayments(data.payments || [])
    } catch (err) {
      setPayments([])
      setError(apiErrorMessage(err, 'Gagal memuat data admin.'))
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin) return
    const timer = setTimeout(() => { load(status) }, 0)
    return () => clearTimeout(timer)
  }, [isAdmin, status, load])

  useEffect(() => {
    if (!isAdmin) return
    const timer = setInterval(() => { load(status) }, 30000)
    return () => clearInterval(timer)
  }, [isAdmin, status, load])

  const act = async (payment, kind) => {
    if (kind === 'approve') {
      const ok = window.confirm(
        `Setujui pembayaran ${payment.order_id || `#${payment.id}`} sebesar ${formatRupiah(payment.amount)}?\n\nPastikan dana QRIS benar-benar sudah masuk.`
      )
      if (!ok) return
    }

    setBusyId(payment.id)
    setError('')
    setMessage('')
    try {
      const note = notes[payment.id] || ''
      if (kind === 'approve') await approvePayment(payment.id, note)
      else await rejectPayment(payment.id, note)

      setMessage(
        kind === 'approve'
          ? `Pembayaran ${payment.order_id || `#${payment.id}`} disetujui. Premium diaktifkan 1 bulan.`
          : `Pembayaran ${payment.order_id || `#${payment.id}`} ditolak.`
      )
      await load(status)
    } catch (err) {
      setError(apiErrorMessage(err, 'Aksi gagal. Coba lagi.'))
    } finally {
      setBusyId(null)
    }
  }

  if (authLoading) {
    return <div className="app-loading">Memuat...</div>
  }

  if (!user) {
    return (
      <div className="admin-wrap">
        <div className="page-head">
          <h1>Admin TO-Day</h1>
          <p>Login dengan akun admin untuk memverifikasi pembayaran manual QRIS.</p>
        </div>
        <div className="glass-card panel admin-gate">
          <p className="hint">Halaman ini hanya bisa dibuka oleh akun admin.</p>
          <div className="form-actions">
            <Link className="btn btn-primary" to="/login">Login admin</Link>
          </div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="admin-wrap">
        <div className="page-head">
          <h1>Admin TO-Day</h1>
          <p>Akun ini tidak punya akses admin.</p>
        </div>
        <div className="glass-card panel admin-gate">
          <p className="hint">Login dengan akun admin untuk membuka verifikasi pembayaran.</p>
          <div className="form-actions">
            <Link className="btn btn-primary" to="/profile">Kembali ke profil</Link>
            <button className="btn btn-glass" onClick={logout}>Keluar</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-wrap">
      <div className="page-head">
        <h1>{view === 'payments' ? 'Verifikasi Pembayaran' : 'Kelola Bank Soal'}</h1>
        <p>
          {view === 'payments'
            ? 'Setujui hanya setelah dana QRIS benar-benar masuk.'
            : 'Ubah teks soal, pilihan jawaban, kunci, dan pembahasan.'}
          {' '}Login sebagai {user.email}.
        </p>
      </div>

      <div className="admin-toolbar">
        <div className="tabs" style={{ margin: 0 }}>
          <button
            type="button"
            className={`tab ${view === 'payments' ? 'on' : ''}`}
            onClick={() => setView('payments')}
          >
            Pembayaran
          </button>
          <button
            type="button"
            className={`tab ${view === 'questions' ? 'on' : ''}`}
            onClick={() => setView('questions')}
          >
            Bank Soal
          </button>
        </div>
        <button className="btn btn-glass" onClick={logout}>Keluar admin</button>
      </div>

      {view === 'questions' && <AdminQuestions />}

      {view === 'payments' && <div className="glass-card panel">
        <div className="admin-toolbar">
          <div className="tabs" style={{ margin: 0 }}>
            {['pending', 'paid', 'failed'].map(s => (
              <button
                key={s}
                type="button"
                className={`tab ${status === s ? 'on' : ''}`}
                onClick={() => setStatus(s)}
              >
                {s === 'pending' ? 'Menunggu' : s === 'paid' ? 'Disetujui' : 'Ditolak'}
              </button>
            ))}
          </div>
          <div className="admin-actions">
            <button className="btn btn-glass" onClick={() => load(status)} disabled={loading}>
              {loading ? 'Memuat...' : 'Muat ulang'}
            </button>
          </div>
        </div>

        {message && <div className="saved" role="status" style={{ marginBottom: 12 }}>{message}</div>}
        {error && <div className="error" role="alert">{error}</div>}

        {payments.length === 0 ? (
          <p className="admin-empty">{loading ? 'Memuat data...' : 'Tidak ada transaksi pada status ini.'}</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Pembeli</th>
                  <th>Nominal</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.order_id || `#${p.id}`}</strong>
                      <span className="muted">{formatDate(p.created_at)}</span>
                      <span className="muted">{p.method}</span>
                    </td>
                    <td>
                      {p.name}
                      <span className="muted">@{p.username}</span>
                      <span className="muted">{p.email}</span>
                    </td>
                    <td>{formatRupiah(p.amount)}</td>
                    <td>
                      {p.status === 'pending' ? (
                        <>
                          <input
                            className="admin-note"
                            placeholder="Catatan (opsional)"
                            value={notes[p.id] || ''}
                            onChange={e => setNotes(prev => ({ ...prev, [p.id]: e.target.value }))}
                          />
                          <div className="admin-actions" style={{ marginTop: 8 }}>
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={busyId === p.id}
                              onClick={() => act(p, 'approve')}
                            >
                              {busyId === p.id ? 'Memproses...' : 'Setujui'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-glass"
                              disabled={busyId === p.id}
                              onClick={() => act(p, 'reject')}
                            >
                              Tolak
                            </button>
                          </div>
                        </>
                      ) : (
                        <span className={`pay-status ${p.status}`}>
                          {p.status === 'paid' ? 'Disetujui' : 'Ditolak'}
                        </span>
                      )}
                      {p.admin_note && <span className="muted">Catatan: {p.admin_note}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
      }
    </div>
  )
}
