import { Router } from 'express'
import { pool } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

function rowToTryout(row) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    subtest: row.subtest_code,
    premium: !!row.is_premium,
    duration: row.duration_seconds,
    desc: row.description,
  }
}

async function questionsForTryout(tryoutId) {
  const result = await pool.query(`
    SELECT q.* FROM questions q
    JOIN tryout_questions tq ON tq.question_id = q.id
    WHERE tq.tryout_id = $1
    ORDER BY tq.position ASC
  `, [tryoutId])
  return result.rows
}

// Daftar tryout (tanpa soal/jawaban) -- boleh dilihat siapa saja yang login,
// status terkunci ditentukan oleh is_premium milik tryout vs status akun.
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT t.*, COUNT(tq.question_id)::int AS question_count
    FROM tryouts t
    LEFT JOIN tryout_questions tq ON tq.tryout_id = t.id
    GROUP BY t.id
  `)
  const list = result.rows.map(r => ({ ...rowToTryout(r), questionCount: r.question_count }))
  res.json({ tryouts: list })
}))

// Ambil soal untuk dikerjakan. Jawaban & pembahasan TIDAK dikirim di sini
// supaya tidak bisa dilihat lewat devtools sebelum tryout selesai.
router.get('/:id/questions', requireAuth, asyncHandler(async (req, res) => {
  const tryoutResult = await pool.query('SELECT * FROM tryouts WHERE id = $1', [req.params.id])
  const tryout = tryoutResult.rows[0]
  if (!tryout) return res.status(404).json({ error: 'Tryout tidak ditemukan.' })

  const userResult = await pool.query('SELECT is_premium FROM users WHERE id = $1', [req.userId])
  const user = userResult.rows[0]
  if (tryout.is_premium && !user?.is_premium) {
    return res.status(403).json({ error: 'Tryout ini khusus akun Premium.' })
  }

  const rawQuestions = await questionsForTryout(tryout.id)
  const questions = rawQuestions.map(q => ({
    id: q.id,
    subtest: q.subtest_code,
    stem: q.stem,
    choices: q.choices ? JSON.parse(q.choices) : null,
  }))
  res.json({ tryout: rowToTryout(tryout), questions })
}))

router.post('/:id/report', requireAuth, asyncHandler(async (req, res) => {
  const { questionId, reason } = req.body || {}
  if (!questionId || !reason) return res.status(400).json({ error: 'questionId dan reason wajib diisi.' })
  const q = await pool.query('SELECT id FROM questions WHERE id = $1', [questionId])
  if (q.rowCount === 0) return res.status(404).json({ error: 'Soal tidak ditemukan.' })
  await pool.query(
    'INSERT INTO question_reports (user_id, question_id, reason) VALUES ($1, $2, $3)',
    [req.userId, questionId, reason]
  )
  res.status(201).json({ ok: true })
}))

export default router
