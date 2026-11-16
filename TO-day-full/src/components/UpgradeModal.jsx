import { useState } from 'react'
import { createPayment, confirmPayment } from '../api/payments'
import { apiErrorMessage } from '../api/client'
import './upgrade.css'

const METHODS = ['QRIS', 'GoPay', 'Transfer Bank']

// Catatan: pembayaran di sini berjalan dalam MODE SIMULASI (lihat
// server/src/routes/payments.js). Alur buat-transaksi -> konfirmasi sudah
// sungguhan memanggil backend dan menyimpan ke database, hanya saja tidak
// ada verifikasi uang sungguhan masuk dari payment gateway pihak ketiga.
export default function UpgradeModal({ open, onClose, onPaid }) {
  const [method, setMethod] = useState('QRIS')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  if (!open) return null

  const pay = async () => {
    setLoading(true)
    setError('')
    try {
      const payment = await createPayment(method)
      await confirmPayment(payment.paymentId)
      onPaid?.()
    } catch (err) {
      setError(apiErrorMessage(err, 'Gagal memproses pembayaran. Coba lagi.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="upgrade-backdrop" onClick={onClose}>
      <div className="upgrade-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <h3>Upgrade ke Premium</h3>
        <p>Buka semua tryout UTBK, pembahasan lengkap, Tanya AI, leaderboard, dan analisis passing grade.</p>
        <div className="upgrade-price">Rp 19.000 <small>/ bulan</small></div>
        <div className="method-list">
          {METHODS.map(m => (
            <button key={m} type="button" className={`method ${method === m ? 'on' : ''}`} onClick={() => setMethod(m)} disabled={loading}>{m}</button>
          ))}
        </div>
        <p className="upgrade-note">Pembayaran ini simulasi (belum terhubung payment gateway sungguhan).</p>
        {error && <div className="error" role="alert">{error}</div>}
        <div className="modal-actions">
          <button className="btn btn-glass" onClick={onClose} disabled={loading}>Batal</button>
          <button className="btn btn-primary" onClick={pay} disabled={loading}>{loading ? 'Memproses...' : 'Bayar Rp 19.000'}</button>
        </div>
      </div>
    </div>
  )
}
