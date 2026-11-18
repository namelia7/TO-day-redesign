import { createHash, timingSafeEqual } from 'node:crypto'
import { Router } from 'express'
import { pool } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { snap, midtransServerKey, isMidtransConfigured } from '../lib/midtrans.js'
import { grantPremium } from '../lib/premium.js'

const router = Router()

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

const PRICE = 40000 // Rp per bulan
const METHODS = ['QRIS', 'GoPay', 'Virtual Account', 'Kartu Kredit/Debit']
const MANUAL_METHOD = 'QRIS (WhatsApp)'

function frontendUrl() {
  return (process.env.FRONTEND_URL || '').replace(/\/$/, '')
}

function formatRupiah(value) {
  return `Rp ${Number(value).toLocaleString('id-ID')}`
}

function manualConfig() {
  const whatsappNumber = (process.env.WHATSAPP_NUMBER || '').replace(/\D/g, '')
  const parsedHold = Number.parseInt(process.env.MANUAL_HOLD_HOURS || '24', 10)
  return {
    enabled: process.env.MANUAL_PAYMENT_ENABLED === 'true' && Boolean(whatsappNumber),
    whatsappNumber,
    holdHours: Number.isFinite(parsedHold) && parsedHold > 0 ? parsedHold : 24,
  }
}

function buildWhatsappUrl(user, orderId, whatsappNumber) {
  if (!whatsappNumber) return null
  const message = [
    'Halo Admin TO-Day, saya mau upgrade Premium 1 bulan.',
    `Order: ${orderId}`,
    `Nama: ${user.name}`,
    `Email: ${user.email}`,
    `Mohon kirimkan gambar QRIS untuk pembayaran ${formatRupiah(PRICE)}. Setelah bayar saya kirim bukti di chat ini.`,
  ].join('\n')
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
}

async function findPendingManual(userId, holdHours) {
  const result = await pool.query(
    `SELECT id, provider_ref, amount, created_at
       FROM payments
      WHERE user_id = $1 AND provider = 'manual' AND status = 'pending'
        AND created_at > NOW() - ($2::text || ' hours')::interval
      ORDER BY created_at DESC
      LIMIT 1`,
    [userId, String(holdHours)]
  )
  return result.rows[0] || null
}

/**
 * ALUR PEMBAYARAN (Midtrans Snap)
 * ------------------------------
 * 1. POST /api/payments  -> buat baris payments (pending) + transaksi Snap.
 *    Respons berisi `token` untuk window.snap.pay() di frontend.
 * 2. Pengguna membayar di halaman Midtrans.
 * 3. Midtrans memanggil POST /api/payments/webhook (notifikasi server-ke-server)
 *    dengan signature yang diverifikasi di sini. HANYA webhook ini yang boleh
 *    mengubah status menjadi `paid` dan mengaktifkan premium.
 *
 * Jangan pernah mempercayai status pembayaran yang dikirim langsung dari
 * browser pengguna.
 */

function verifySignature(body) {
  const { order_id: orderId, status_code: statusCode, gross_amount: grossAmount, signature_key: signature } = body
  if (!orderId || !statusCode || !grossAmount || !signature) return false

  const expected = createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${midtransServerKey}`)
    .digest('hex')

  const a = Buffer.from(expected)
  const b = Buffer.from(String(signature))
  return a.length === b.length && timingSafeEqual(a, b)
}

// Memetakan transaction_status Midtrans ke status internal kita.
function mapStatus(transactionStatus, fraudStatus) {
  switch (transactionStatus) {
    case 'capture':
      // Kartu kredit: hanya lunas jika fraud check lolos.
      if (fraudStatus === 'accept') return 'paid'
      return 'pending'
    case 'settlement':
      return 'paid'
    case 'pending':
      return 'pending'
    case 'deny':
    case 'cancel':
    case 'expire':
    case 'failure':
      return 'failed'
    case 'refund':
    case 'partial_refund':
      return 'failed'
    default:
      return null
  }
}

router.get('/price', requireAuth, asyncHandler(async (req, res) => {
  const manual = manualConfig()
  const userResult = await pool.query('SELECT name, email FROM users WHERE id = $1', [req.userId])
  const user = userResult.rows[0]
  if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' })

  let pending = null
  if (manual.enabled) {
    const row = await findPendingManual(req.userId, manual.holdHours)
    if (row) {
      pending = {
        paymentId: row.id,
        orderId: row.provider_ref,
        amount: row.amount,
        status: 'pending',
        createdAt: row.created_at,
        whatsappUrl: buildWhatsappUrl(user, row.provider_ref, manual.whatsappNumber),
      }
    }
  }

  res.json({
    price: PRICE,
    amount: PRICE, // kompatibilitas dengan klien lama
    methods: METHODS,
    currency: 'IDR',
    provider: 'midtrans',
    midtrans: { enabled: isMidtransConfigured },
    manual,
    pending,
  })
}))

// Membuat (atau memakai ulang) order pembayaran manual via QRIS + WhatsApp.
// Tidak ada uang yang otomatis diverifikasi di sini; admin yang menyetujui.
router.post('/manual', requireAuth, asyncHandler(async (req, res) => {
  const manual = manualConfig()
  if (!manual.enabled) {
    return res.status(503).json({ error: 'Pembayaran manual belum diaktifkan oleh admin.' })
  }

  const userResult = await pool.query('SELECT name, email FROM users WHERE id = $1', [req.userId])
  const user = userResult.rows[0]
  if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' })

  let payment = await findPendingManual(req.userId, manual.holdHours)

  if (!payment) {
    const inserted = await pool.query(
      `INSERT INTO payments (user_id, amount, method, status, provider)
       VALUES ($1, $2, $3, 'pending', 'manual')
       RETURNING id, created_at`,
      [req.userId, PRICE, MANUAL_METHOD]
    )
    const paymentId = inserted.rows[0].id
    const orderId = `TO-M-${paymentId}`
    await pool.query('UPDATE payments SET provider_ref = $1 WHERE id = $2', [orderId, paymentId])
    payment = {
      id: paymentId,
      provider_ref: orderId,
      amount: PRICE,
      created_at: inserted.rows[0].created_at,
    }
  }

  const createdAt = new Date(payment.created_at)
  const expiresAt = new Date(createdAt.getTime() + manual.holdHours * 60 * 60 * 1000)

  res.status(201).json({
    paymentId: payment.id,
    orderId: payment.provider_ref,
    amount: payment.amount,
    method: MANUAL_METHOD,
    whatsappUrl: buildWhatsappUrl(user, payment.provider_ref, manual.whatsappNumber),
    holdHours: manual.holdHours,
    expiresAt: expiresAt.toISOString(),
  })
}))

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  if (!isMidtransConfigured) {
    return res.status(503).json({
      error: 'Pembayaran belum tersedia. Konfigurasi Midtrans belum diisi oleh admin.',
    })
  }

  const method = typeof req.body?.method === 'string' && req.body.method
    ? req.body.method.slice(0, 50)
    : 'Midtrans Snap'

  const userResult = await pool.query('SELECT name, email FROM users WHERE id = $1', [req.userId])
  const user = userResult.rows[0]
  if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' })

  // Buat baris pending dulu supaya webhook selalu punya transaksi untuk dicocokkan.
  const inserted = await pool.query(
    `INSERT INTO payments (user_id, amount, method, status, provider)
     VALUES ($1, $2, $3, 'pending', 'midtrans')
     RETURNING id`,
    [req.userId, PRICE, method]
  )
  const paymentId = inserted.rows[0].id
  const orderId = `TO-${paymentId}-${Date.now()}`

  await pool.query('UPDATE payments SET provider_ref = $1 WHERE id = $2', [orderId, paymentId])

  const parameter = {
    transaction_details: { order_id: orderId, gross_amount: PRICE },
    item_details: [
      { id: 'premium-1-month', price: PRICE, quantity: 1, name: 'Premium TO-Day 1 bulan' },
    ],
    customer_details: { first_name: user.name, email: user.email },
    expiry: { unit: 'hours', duration: 24 },
  }

  const base = frontendUrl()
  if (base) parameter.callbacks = { finish: `${base}/profile?payment=finish` }

  try {
    const transaction = await snap.createTransaction(parameter)
    res.status(201).json({
      paymentId,
      orderId,
      token: transaction.token,
      redirectUrl: transaction.redirect_url,
    })
  } catch (err) {
    await pool.query(`UPDATE payments SET status = 'failed' WHERE id = $1`, [paymentId])
    console.error('Gagal membuat transaksi Midtrans:', err?.httpStatusCode, err?.ApiResponse || err?.message)
    res.status(502).json({ error: 'Gagal membuat transaksi pembayaran. Coba lagi.' })
  }
}))

// Webhook dari Midtrans. Tanpa auth (diverifikasi lewat signature_key).
router.post('/webhook', asyncHandler(async (req, res) => {
  if (!isMidtransConfigured) {
    return res.status(503).json({ error: 'Midtrans belum dikonfigurasi.' })
  }

  const body = req.body || {}

  if (!verifySignature(body)) {
    console.warn('Webhook Midtrans ditolak: signature tidak valid.', body.order_id)
    return res.status(401).json({ error: 'Signature tidak valid.' })
  }

  const orderId = String(body.order_id)
  const grossAmount = Number.parseFloat(String(body.gross_amount))
  const newStatus = mapStatus(body.transaction_status, body.fraud_status)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const result = await client.query(
      'SELECT id, user_id, amount, status FROM payments WHERE provider_ref = $1 FOR UPDATE',
      [orderId]
    )
    const payment = result.rows[0]
    if (!payment) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Transaksi tidak ditemukan.' })
    }

    if (!Number.isFinite(grossAmount) || grossAmount !== payment.amount) {
      await client.query('ROLLBACK')
      console.warn('Webhook Midtrans: nominal tidak cocok.', orderId, body.gross_amount, payment.amount)
      return res.status(400).json({ error: 'Nominal tidak cocok.' })
    }

    if (!newStatus) {
      await client.query('ROLLBACK')
      console.log('Webhook Midtrans: status diabaikan:', body.transaction_status)
      return res.json({ ok: true, ignored: true })
    }

    if (newStatus === 'paid') {
      if (payment.status === 'paid') {
        await client.query('COMMIT')
        return res.json({ ok: true, alreadyPaid: true })
      }
      await client.query(
        `UPDATE payments SET status = 'paid', paid_at = NOW() WHERE id = $1`,
        [payment.id]
      )
      await grantPremium(client, payment.user_id)
    } else if (payment.status === 'pending') {
      await client.query('UPDATE payments SET status = $1 WHERE id = $2', [newStatus, payment.id])
    }

    await client.query('COMMIT')
    res.json({ ok: true })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}))

router.get('/history', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC',
    [req.userId]
  )
  res.json({ payments: result.rows })
}))

// Dipakai frontend untuk polling setelah popup Snap selesai, karena webhook
// bisa datang beberapa detik setelah pengguna kembali ke aplikasi.
router.get('/:id/status', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT p.id, p.status, p.amount, p.method, p.paid_at,
            u.is_premium, to_char(u.premium_until, 'YYYY-MM-DD') AS premium_until
       FROM payments p
       JOIN users u ON u.id = p.user_id
      WHERE p.id = $1 AND p.user_id = $2`,
    [req.params.id, req.userId]
  )
  const row = result.rows[0]
  if (!row) return res.status(404).json({ error: 'Transaksi tidak ditemukan.' })

  res.json({
    paymentId: row.id,
    status: row.status,
    amount: row.amount,
    method: row.method,
    paidAt: row.paid_at,
    isPremium: !!row.is_premium,
    premiumUntil: row.premium_until,
  })
}))

export default router
