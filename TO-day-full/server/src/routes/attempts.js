import { Router } from 'express'
import { pool } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

function isCorrect(question, given) {
  if (question.choices) {
    return String(given) === String(question.answer)
  }
  return String(given ?? '').trim().toLowerCase() === String(question.answer).trim().toLowerCase()
}

// Submit jawaban. Penilaian dilakukan di server (bukan di client) supaya
// skor tidak bisa dimanipulasi lewat devtools.
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { tryoutId, answers, timeUsed } = req.body || {}
  if (!tryoutId || typeof answers !== 'object') {
    return res.status(400).json({ error: 'tryoutId dan answers wajib diisi.' })
  }

  const tryoutResult = await pool.query('SELECT * FROM tryouts WHERE id = $1', [tryoutId])
  const tryout = tryoutResult.rows[0]
  if (!tryout) return res.status(404).json({ error: 'Tryout tidak ditemukan.' })

  const userResult = await pool.query('SELECT is_premium FROM users WHERE id = $1', [req.userId])
  const user = userResult.rows[0]
  if (tryout.is_premium && !user?.is_premium) {
    return res.status(403).json({ error: 'Tryout ini khusus akun Premium.' })
  }

  const questionsResult = await pool.query(`
    SELECT q.* FROM questions q
    JOIN tryout_questions tq ON tq.question_id = q.id
    WHERE tq.tryout_id = $1
    ORDER BY tq.position ASC
  `, [tryoutId])
  const questions = questionsResult.rows.map(q => ({
    ...q,
    choices: q.choices ? JSON.parse(q.choices) : null,
  }))

  let correct = 0
  for (const q of questions) {
    if (isCorrect(q, answers[q.id])) correct++
  }
  const score = Math.round(200 + (correct / questions.length) * 800)
  const timeUsedSafe = Math.max(0, Math.min(Number(timeUsed) || 0, tryout.duration_seconds))

  const inserted = await pool.query(`
    INSERT INTO attempts (user_id, tryout_id, answers, score, correct_count, total_count, time_used_seconds)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `, [req.userId, tryoutId, JSON.stringify(answers), score, correct, questions.length, timeUsedSafe])

  res.status(201).json({ attemptId: inserted.rows[0].id, score, correct, total: questions.length })
}))

// Hasil + pembahasan untuk satu attempt. Pembahasan lengkap hanya untuk
// Premium; akun gratis hanya melihat 3 soal pertama (gating di server, bukan di client).
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const attemptResult = await pool.query(
    'SELECT * FROM attempts WHERE id = $1 AND user_id = $2',
    [req.params.id, req.userId]
  )
  const attempt = attemptResult.rows[0]
  if (!attempt) return res.status(404).json({ error: 'Hasil tidak ditemukan.' })

  const tryoutResult = await pool.query('SELECT * FROM tryouts WHERE id = $1', [attempt.tryout_id])
  const tryout = tryoutResult.rows[0]
  const userResult = await pool.query('SELECT is_premium FROM users WHERE id = $1', [req.userId])
  const pro = !!userResult.rows[0]?.is_premium

  const questionsResult = await pool.query(`
    SELECT q.* FROM questions q
    JOIN tryout_questions tq ON tq.question_id = q.id
    WHERE tq.tryout_id = $1
    ORDER BY tq.position ASC
  `, [attempt.tryout_id])

  const answers = JSON.parse(attempt.answers)
  const FREE_EXPLAIN = 3

  const breakdown = questionsResult.rows.map((q, i) => {
    const choices = q.choices ? JSON.parse(q.choices) : null
    const given = answers[q.id]
    const ok = isCorrect(q, given)
    const base = {
      id: q.id, subtest: q.subtest_code, stem: q.stem, choices, given,
      correct: ok,
    }
    if (!pro && i >= FREE_EXPLAIN) return { ...base, locked: true }
    return { ...base, locked: false, answer: q.answer, explain: q.explain }
  })

  res.json({
    attempt: {
      id: attempt.id,
      tryoutId: attempt.tryout_id,
      tryoutTitle: tryout.title,
      score: attempt.score,
      correct: attempt.correct_count,
      total: attempt.total_count,
      timeUsed: attempt.time_used_seconds,
      createdAt: attempt.created_at,
    },
    isPremium: pro,
    freeExplainCount: FREE_EXPLAIN,
    breakdown,
  })
}))

// Riwayat semua attempt milik user, dipakai halaman statistik.
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT a.*, t.title as tryout_title FROM attempts a
    JOIN tryouts t ON t.id = a.tryout_id
    WHERE a.user_id = $1
    ORDER BY a.created_at DESC
  `, [req.userId])
  res.json({
    attempts: result.rows.map(r => ({
      id: r.id, tryoutId: r.tryout_id, tryoutTitle: r.tryout_title,
      score: r.score, correct: r.correct_count, total: r.total_count,
      timeUsed: r.time_used_seconds, createdAt: r.created_at,
    })),
  })
}))

export default router
