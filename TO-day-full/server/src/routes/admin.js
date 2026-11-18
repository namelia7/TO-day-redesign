import { Router } from 'express'
import { pool } from '../db/index.js'
import { requireAdmin } from '../middleware/admin.js'
import { grantPremium } from '../lib/premium.js'

const router = Router()

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

router.use(requireAdmin)

function cleanNote(note) {
  return typeof note === 'string' && note.trim() ? note.trim().slice(0, 500) : null
}

// Daftar transaksi untuk halaman admin. Default: yang masih pending.
router.get('/payments', asyncHandler(async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : 'pending'
  if (!['pending', 'paid', 'failed'].includes(status)) {
    return res.status(400).json({ error: 'Status tidak valid.' })
  }

  const result = await pool.query(`
    SELECT p.id, p.provider_ref AS order_id, p.amount, p.method, p.provider,
           p.status, p.admin_note, p.created_at, p.paid_at,
           u.name, u.email
      FROM payments p
      JOIN users u ON u.id = p.user_id
     WHERE p.status = $1
     ORDER BY p.created_at ASC
     LIMIT 200
  `, [status])

  res.json({ payments: result.rows })
}))

router.post('/payments/:id/approve', asyncHandler(async (req, res) => {
  const note = cleanNote(req.body?.note)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const result = await client.query(
      'SELECT id, user_id, status, provider FROM payments WHERE id = $1 FOR UPDATE',
      [req.params.id]
    )
    const payment = result.rows[0]
    if (!payment) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Transaksi tidak ditemukan.' })
    }
    if (payment.provider !== 'manual') {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Hanya pembayaran manual yang bisa disetujui di sini.' })
    }
    if (payment.status === 'paid') {
      await client.query('COMMIT')
      return res.json({ ok: true, alreadyPaid: true })
    }
    if (payment.status !== 'pending') {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'Transaksi ini sudah tidak berstatus pending.' })
    }

    await client.query(
      `UPDATE payments SET status = 'paid', paid_at = NOW(), admin_note = $1 WHERE id = $2`,
      [note, payment.id]
    )
    const premium = await grantPremium(client, payment.user_id)

    await client.query('COMMIT')
    res.json({ ok: true, ...premium })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}))

router.post('/payments/:id/reject', asyncHandler(async (req, res) => {
  const note = cleanNote(req.body?.note)
  const result = await pool.query(
    `UPDATE payments SET status = 'failed', admin_note = $1
      WHERE id = $2 AND provider = 'manual' AND status = 'pending'
      RETURNING id`,
    [note, req.params.id]
  )
  if (result.rowCount === 0) {
    return res.status(409).json({ error: 'Transaksi tidak ditemukan atau sudah diproses.' })
  }
  res.json({ ok: true })
}))

export default router
