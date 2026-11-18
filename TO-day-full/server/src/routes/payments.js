import { Router } from 'express'
import { pool } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

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

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { method } = req.body || {}
  if (!METHODS.includes(method)) {
    return res.status(400).json({ error: `Metode pembayaran harus salah satu dari: ${METHODS.join(', ')}` })
  }

  // --- MODE SIMULASI (default) ---
  // Di produksi sungguhan, baris di bawah ini diganti dengan panggilan API
  // ke payment gateway untuk membuat transaksi sungguhan.
  const inserted = await pool.query(`
    INSERT INTO payments (user_id, amount, method, status, provider)
    VALUES ($1, $2, $3, 'pending', 'simulated')
    RETURNING id
  `, [req.userId, PRICE, method])

  res.status(201).json({
    paymentId: inserted.rows[0].id,
    amount: PRICE,
    method,
    status: 'pending',
    simulated: true,
    note: 'Transaksi ini simulasi. Panggil POST /payments/:id/confirm untuk menyelesaikan (menggantikan webhook gateway asli).',
  })
}))

// Di dunia nyata, langkah ini digantikan oleh WEBHOOK dari payment gateway
// (server mereka yang memberi tahu server kita bahwa uang sudah masuk),
// bukan dipanggil langsung oleh pengguna dari browser.
router.post('/:id/confirm', requireAuth, asyncHandler(async (req, res) => {
  const paymentResult = await pool.query(
    'SELECT * FROM payments WHERE id = $1 AND user_id = $2',
    [req.params.id, req.userId]
  )
  const payment = paymentResult.rows[0]
  if (!payment) return res.status(404).json({ error: 'Transaksi tidak ditemukan.' })
  if (payment.status === 'paid') return res.json({ ok: true, alreadyPaid: true })

  const until = new Date()
  until.setMonth(until.getMonth() + 1)
  const untilDate = until.toISOString().slice(0, 10)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `UPDATE payments SET status = 'paid', paid_at = NOW() WHERE id = $1`,
      [payment.id]
    )
    await client.query(
      `UPDATE users SET is_premium = TRUE, premium_until = $1 WHERE id = $2`,
      [untilDate, req.userId]
    )
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  const userResult = await pool.query(
    `SELECT is_premium, to_char(premium_until, 'YYYY-MM-DD') AS premium_until
     FROM users WHERE id = $1`,
    [req.userId]
  )
  const user = userResult.rows[0]
  res.json({ ok: true, isPremium: !!user.is_premium, premiumUntil: user.premium_until })
}))

router.get('/history', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC',
    [req.userId]
  )
  res.json({ payments: result.rows })
}))

export default router
