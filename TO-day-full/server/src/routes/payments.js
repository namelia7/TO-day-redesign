import { Router } from 'express'
import { db } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const PRICE = 19000 // Rp per bulan
const METHODS = ['QRIS', 'GoPay', 'Transfer Bank']

/**
 * CATATAN PENTING -- MODE PEMBAYARAN
 * -----------------------------------
 * Endpoint di bawah ini mengimplementasikan ALUR pembayaran secara lengkap
 * (buat transaksi -> konfirmasi -> aktifkan premium), TAPI tidak terhubung
 * ke payment gateway sungguhan. Status pembayaran langsung "paid" begitu
 * endpoint /confirm dipanggil -- tidak ada verifikasi uang masuk yang nyata.
 *
 * Ini dilakukan karena payment gateway sungguhan (Midtrans, Xendit, dll)
 * membutuhkan akun bisnis, API key rahasia, dan proses verifikasi merchant
 * milik PEMILIK APLIKASI -- itu tidak bisa dibuat berfungsi oleh siapa pun
 * selain pemilik akun tersebut.
 *
 * UNTUK MENGAKTIFKAN PEMBAYARAN SUNGGUHAN:
 * 1. Daftar akun merchant di payment gateway pilihan (contoh: Midtrans atau Xendit).
 * 2. Pasang SDK resmi mereka (npm install midtrans-client, atau xendit-node).
 * 3. Di createTransaction() di bawah, ganti blok "provider: simulated" dengan
 *    pemanggilan API resmi gateway untuk membuat transaksi (biasanya
 *    menghasilkan URL pembayaran atau kode QRIS asli).
 * 4. Tambahkan endpoint webhook terpisah (misal POST /payments/webhook) yang
 *    menerima notifikasi SAH dari gateway (dengan verifikasi signature!)
 *    dan baru mengubah status "paid" di database -- JANGAN percaya status
 *    "paid" dari request yang datang langsung dari browser pengguna.
 * 5. Simpan API key di file .env (lihat .env.example), jangan pernah
 *    menuliskannya langsung di kode atau mengirimnya ke frontend.
 */

router.get('/price', requireAuth, (req, res) => {
  res.json({ amount: PRICE, methods: METHODS, currency: 'IDR', simulated: true })
})

router.post('/', requireAuth, (req, res) => {
  const { method } = req.body || {}
  if (!METHODS.includes(method)) {
    return res.status(400).json({ error: `Metode pembayaran harus salah satu dari: ${METHODS.join(', ')}` })
  }

  // --- MODE SIMULASI (default) ---
  // Di produksi sungguhan, baris di bawah ini diganti dengan panggilan API
  // ke payment gateway untuk membuat transaksi sungguhan.
  const info = db.prepare(`
    INSERT INTO payments (user_id, amount, method, status, provider)
    VALUES (?, ?, ?, 'pending', 'simulated')
  `).run(req.userId, PRICE, method)

  res.status(201).json({
    paymentId: info.lastInsertRowid,
    amount: PRICE,
    method,
    status: 'pending',
    simulated: true,
    note: 'Transaksi ini simulasi. Panggil POST /payments/:id/confirm untuk menyelesaikan (menggantikan webhook gateway asli).',
  })
})

// Di dunia nyata, langkah ini digantikan oleh WEBHOOK dari payment gateway
// (server mereka yang memberi tahu server kita bahwa uang sudah masuk),
// bukan dipanggil langsung oleh pengguna dari browser.
router.post('/:id/confirm', requireAuth, (req, res) => {
  const payment = db.prepare('SELECT * FROM payments WHERE id = ? AND user_id = ?').get(req.params.id, req.userId)
  if (!payment) return res.status(404).json({ error: 'Transaksi tidak ditemukan.' })
  if (payment.status === 'paid') return res.json({ ok: true, alreadyPaid: true })

  const tx = db.transaction(() => {
    db.prepare(`UPDATE payments SET status = 'paid', paid_at = datetime('now') WHERE id = ?`).run(payment.id)
    const until = new Date()
    until.setMonth(until.getMonth() + 1)
    db.prepare(`UPDATE users SET is_premium = 1, premium_until = ? WHERE id = ?`)
      .run(until.toISOString().slice(0, 10), req.userId)
  })
  tx()

  const user = db.prepare('SELECT is_premium, premium_until FROM users WHERE id = ?').get(req.userId)
  res.json({ ok: true, isPremium: !!user.is_premium, premiumUntil: user.premium_until })
})

router.get('/history', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC').all(req.userId)
  res.json({ payments: rows })
})

export default router
