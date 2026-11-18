import { useEffect, useState } from 'react'
import {
  createManualPayment,
  createPayment,
  getPaymentInfo,
  getPaymentStatus,
} from '../api/payments'
import { apiErrorMessage } from '../api/client'
import { loadSnap } from '../lib/snap'
import './upgrade.css'

const FALLBACK_PRICE = 40000

function formatRupiah(value) {
  return `Rp ${Number(value).toLocaleString('id-ID')}`
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// Dua mode pembayaran:
// - manual: QRIS dibagikan admin lewat WhatsApp, lalu diverifikasi manual.
// - midtrans: popup Snap (aktif hanya jika kredensial Midtrans diisi).
export default function UpgradeModal({ onClose, onPaid }) {
  const [info, setInfo] = useState(null)
  const [mode, setMode] = useState('manual')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [copied, setCopied] = useState('')

  useEffect(() => {
    let active = true
    getPaymentInfo()
      .then(data => {
        if (!active) return
        setInfo(data)
        setOrder(data?.pending || null)
        if (!data?.manual?.enabled && data?.midtrans?.enabled) setMode('midtrans')
        else setMode('manual')
      })
      .catch(err => {
        if (active) setError(apiErrorMessage(err, 'Gagal memuat info pembayaran.'))
      })
    return () => { active = false }
  }, [])

  const price = info?.price ?? FALLBACK_PRICE
  const manualEnabled = !!info?.manual?.enabled
  const midtransEnabled = !!info?.midtrans?.enabled
  const bothEnabled = manualEnabled && midtransEnabled

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(''), 1800)
    } catch {
      setError('Gagal menyalin otomatis. Silakan salin manual dari teks di atas.')
    }
  }

  const openWhatsApp = () => {
    if (!order?.whatsappUrl) {
      setError('Nomor WhatsApp admin belum dikonfigurasi.')
      return
    }
    window.open(order.whatsappUrl, '_blank', 'noopener,noreferrer')
  }

  const startManual = async () => {
    setLoading(true)
    setError('')
    setStatus('')
    try {
      const data = await createManualPayment()
      setOrder(data)
      setStatus('Order dibuat. Buka WhatsApp untuk meminta gambar QRIS, lalu bayar dan kirim bukti.')
    } catch (err) {
      setError(apiErrorMessage(err, 'Gagal membuat order. Coba lagi.'))
    } finally {
      setLoading(false)
    }
  }

  const checkStatus = async () => {
    if (!order?.paymentId) return
    setLoading(true)
    setError('')
    try {
      const data = await getPaymentStatus(order.paymentId)
      if (data.status === 'paid') {
        await onPaid?.()
        return
      }
      if (data.status === 'failed') {
        setOrder(null)
        setStatus('')
        setError('Pembayaran ditolak atau kedaluwarsa. Silakan buat order baru.')
        return
      }
      setStatus('Pembayaran belum diverifikasi. Admin akan memproses setelah mengecek pembayaran QRIS.')
    } catch (err) {
      setError(apiErrorMessage(err, 'Gagal mengecek status pembayaran.'))
    } finally {
      setLoading(false)
    }
  }

  // Popup Midtrans bisa selesai sebelum webhook masuk, jadi status di-polling.
  const waitForPaid = async (paymentId) => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        const data = await getPaymentStatus(paymentId)
        if (data.status === 'paid') {
          await onPaid?.()
          return
        }
        if (data.status === 'failed') {
          setError('Pembayaran gagal atau kedaluwarsa. Silakan coba lagi.')
          return
        }
      } catch {
        // abaikan, coba lagi
      }
      await sleep(2000)
    }
    setStatus('Pembayaran sedang diproses. Muat ulang halaman ini beberapa saat lagi untuk melihat status terbaru.')
  }

  const payWithMidtrans = async () => {
    setLoading(true)
    setError('')
    setStatus('')
    try {
      const payment = await createPayment()
      const snapReady = await loadSnap().catch(() => false)

      if (snapReady && window.snap?.pay) {
        window.snap.pay(payment.token, {
          onSuccess: () => { waitForPaid(payment.paymentId) },
          onPending: () => {
            setStatus('Menunggu pembayaran diselesaikan.')
            setLoading(false)
            waitForPaid(payment.paymentId)
          },
          onError: () => {
            setError('Pembayaran gagal. Silakan coba lagi.')
            setLoading(false)
          },
          onClose: () => {
            setStatus('Jendela pembayaran ditutup. Transaksi belum selesai.')
            setLoading(false)
          },
        })
      } else if (payment.redirectUrl) {
        window.location.href = payment.redirectUrl
      } else {
        setError('Halaman pembayaran tidak tersedia. Muat ulang halaman lalu coba lagi.')
        setLoading(false)
      }
    } catch (err) {
      setError(apiErrorMessage(err, 'Gagal memproses pembayaran. Coba lagi.'))
      setLoading(false)
    }
  }

  return (
    <div className="upgrade-backdrop" onClick={loading ? undefined : onClose}>
      <div className="upgrade-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <h3>Upgrade ke Premium</h3>
        <p>Buka semua tryout UTBK, pembahasan lengkap, Tanya AI, leaderboard, dan analisis passing grade.</p>
        <div className="upgrade-price">{formatRupiah(price)} <small>/ bulan</small></div>

        {bothEnabled && (
          <div className="tabs">
            <button
              type="button"
              className={`tab ${mode === 'manual' ? 'on' : ''}`}
              onClick={() => { setMode('manual'); setError(''); setStatus('') }}
            >QRIS via WhatsApp</button>
            <button
              type="button"
              className={`tab ${mode === 'midtrans' ? 'on' : ''}`}
              onClick={() => { setMode('midtrans'); setError(''); setStatus('') }}
            >Bayar Otomatis</button>
          </div>
        )}

        {mode === 'manual' && manualEnabled && (
          <div className="qr-flow">
            <ol className="qr-steps">
              <li>Buka WhatsApp dan minta gambar QRIS ke admin.</li>
              <li>Scan QRIS, lalu bayar <strong>{formatRupiah(price)}</strong>.</li>
              <li>Kirim bukti pembayaran di chat yang sama.</li>
            </ol>

            {order ? (
              <div className="order-box">
                <div className="order-row">
                  <span>Order ID</span>
                  <strong>{order.orderId}</strong>
                </div>
                <div className="order-row">
                  <span>Nominal</span>
                  <strong>{formatRupiah(order.amount ?? price)}</strong>
                </div>
                <div className="order-actions">
                  <button type="button" className="link-btn" onClick={() => copy(order.orderId, 'order')}>
                    {copied === 'order' ? 'Order ID tersalin' : 'Salin Order ID'}
                  </button>
                  <button type="button" className="link-btn" onClick={() => copy(String(order.amount ?? price), 'amount')}>
                    {copied === 'amount' ? 'Nominal tersalin' : 'Salin nominal'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="upgrade-note">Order akan dibuat setelah kamu menekan tombol di bawah.</p>
            )}
          </div>
        )}

        {mode === 'manual' && !manualEnabled && (
          <div className="upgrade-info" role="status">
            Pembayaran manual belum diaktifkan oleh admin.
          </div>
        )}

        {mode === 'midtrans' && midtransEnabled && (
          <p className="upgrade-note">
            Metode pembayaran (QRIS, GoPay, Virtual Account, kartu) dipilih di halaman Midtrans.
          </p>
        )}

        {mode === 'midtrans' && !midtransEnabled && (
          <div className="upgrade-info" role="status">
            Pembayaran otomatis belum tersedia. Gunakan QRIS via WhatsApp.
          </div>
        )}

        <p className="upgrade-note">
          Premium aktif setelah pembayaran diverifikasi admin. Simpan bukti transfer sampai premium aktif.
        </p>

        {status && <div className="upgrade-info" role="status">{status}</div>}
        {error && <div className="error" role="alert">{error}</div>}

        <div className="modal-actions">
          <button className="btn btn-glass" onClick={onClose} disabled={loading}>Batal</button>

          {mode === 'manual' && manualEnabled && !order && (
            <button className="btn btn-primary" onClick={startManual} disabled={loading}>
              {loading ? 'Membuat order...' : 'Buat Order & Minta QRIS'}
            </button>
          )}

          {mode === 'manual' && manualEnabled && order && (
            <>
              <button className="btn btn-glass" onClick={checkStatus} disabled={loading}>
                {loading ? 'Mengecek...' : 'Cek Status'}
              </button>
              <button className="btn btn-primary" onClick={openWhatsApp} disabled={loading}>
                Buka WhatsApp
              </button>
            </>
          )}

          {mode === 'midtrans' && midtransEnabled && (
            <button className="btn btn-primary" onClick={payWithMidtrans} disabled={loading}>
              {loading ? 'Memproses...' : `Bayar ${formatRupiah(price)}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
