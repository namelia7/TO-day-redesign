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
           u.name, u.username, u.email
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

function parseChoices(value) {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function validateQuestionInput(body) {
  const subtest = typeof body?.subtest === 'string' ? body.subtest.trim().toUpperCase() : ''
  const stem = typeof body?.stem === 'string' ? body.stem.trim() : ''
  const explain = typeof body?.explain === 'string' ? body.explain.trim() : ''

  if (!subtest) return { error: 'Subtes wajib dipilih.' }
  if (!stem) return { error: 'Teks soal wajib diisi.' }
  if (!explain) return { error: 'Pembahasan wajib diisi.' }

  let choices = null
  if (Array.isArray(body?.choices)) {
    choices = body.choices.map(choice => String(choice ?? '').trim())
    if (choices.length < 2) return { error: 'Pilihan ganda minimal 2 opsi.' }
    if (choices.length > 6) return { error: 'Pilihan ganda maksimal 6 opsi.' }
    if (choices.some(choice => !choice)) return { error: 'Semua pilihan jawaban wajib diisi.' }
  }

  let answer
  if (choices) {
    const index = Number(body?.answer)
    if (!Number.isInteger(index) || index < 0 || index >= choices.length) {
      return { error: 'Kunci jawaban tidak valid.' }
    }
    answer = String(index)
  } else {
    answer = String(body?.answer ?? '').trim()
    if (!answer) return { error: 'Kunci jawaban isian wajib diisi.' }
  }

  return { data: { subtest, stem, explain, choices, answer } }
}

// Daftar soal untuk editor admin, lengkap dengan jumlah tryout yang memakainya.
router.get('/questions', asyncHandler(async (req, res) => {
  const subtest = typeof req.query.subtest === 'string' ? req.query.subtest.trim().toUpperCase() : ''
  const search = typeof req.query.q === 'string' ? req.query.q.trim() : ''

  const params = []
  const conditions = []
  if (subtest) {
    params.push(subtest)
    conditions.push(`q.subtest_code = $${params.length}`)
  }
  if (search) {
    params.push(`%${search}%`)
    conditions.push(`q.stem ILIKE $${params.length}`)
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const result = await pool.query(`
    SELECT q.id, q.subtest_code, q.stem, q.choices, q.answer, q.explain,
           COUNT(tq.tryout_id)::int AS tryout_count
      FROM questions q
      LEFT JOIN tryout_questions tq ON tq.question_id = q.id
      ${where}
     GROUP BY q.id
     ORDER BY q.subtest_code, q.id
     LIMIT 500
  `, params)

  const questions = result.rows.map(q => ({ ...q, choices: parseChoices(q.choices) }))
  res.json({ questions })
}))

router.put('/questions/:id', asyncHandler(async (req, res) => {
  const parsed = validateQuestionInput(req.body)
  if (parsed.error) return res.status(400).json({ error: parsed.error })
  const { data } = parsed

  const subtestResult = await pool.query('SELECT code FROM subtests WHERE code = $1', [data.subtest])
  if (subtestResult.rowCount === 0) {
    return res.status(400).json({ error: 'Subtes tidak ditemukan.' })
  }

  const result = await pool.query(`
    UPDATE questions
       SET subtest_code = $1, stem = $2, choices = $3, answer = $4, explain = $5
     WHERE id = $6
     RETURNING id, subtest_code, stem, choices, answer, explain
  `, [
    data.subtest,
    data.stem,
    data.choices ? JSON.stringify(data.choices) : null,
    data.answer,
    data.explain,
    req.params.id,
  ])

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Soal tidak ditemukan.' })
  }
  const question = result.rows[0]
  res.json({ question: { ...question, choices: parseChoices(question.choices) } })
}))

export default router
