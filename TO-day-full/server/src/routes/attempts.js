import { Router } from 'express'
import { db } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

function isCorrect(question, given) {
  if (question.choices) {
    return String(given) === String(question.answer)
  }
  return String(given ?? '').trim().toLowerCase() === String(question.answer).trim().toLowerCase()
}

// Submit jawaban. Penilaian dilakukan di server (bukan di client) supaya
// skor tidak bisa dimanipulasi lewat devtools.
router.post('/', requireAuth, (req, res) => {
  const { tryoutId, answers, timeUsed } = req.body || {}
  if (!tryoutId || typeof answers !== 'object') {
    return res.status(400).json({ error: 'tryoutId dan answers wajib diisi.' })
  }

  const tryout = db.prepare('SELECT * FROM tryouts WHERE id = ?').get(tryoutId)
  if (!tryout) return res.status(404).json({ error: 'Tryout tidak ditemukan.' })

  const user = db.prepare('SELECT is_premium FROM users WHERE id = ?').get(req.userId)
  if (tryout.is_premium && !user.is_premium) {
    return res.status(403).json({ error: 'Tryout ini khusus akun Premium.' })
  }

  const questions = db.prepare(`
    SELECT q.* FROM questions q
    JOIN tryout_questions tq ON tq.question_id = q.id
    WHERE tq.tryout_id = ?
    ORDER BY tq.position ASC
  `).all(tryoutId).map(q => ({ ...q, choices: q.choices ? JSON.parse(q.choices) : null }))

  let correct = 0
  for (const q of questions) {
    if (isCorrect(q, answers[q.id])) correct++
  }
  const score = Math.round(200 + (correct / questions.length) * 800)
  const timeUsedSafe = Math.max(0, Math.min(Number(timeUsed) || 0, tryout.duration_seconds))

  const info = db.prepare(`
    INSERT INTO attempts (user_id, tryout_id, answers, score, correct_count, total_count, time_used_seconds)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.userId, tryoutId, JSON.stringify(answers), score, correct, questions.length, timeUsedSafe)

  res.status(201).json({ attemptId: info.lastInsertRowid, score, correct, total: questions.length })
})

// Hasil + pembahasan untuk satu attempt. Pembahasan lengkap hanya untuk
// Premium; akun gratis hanya melihat 3 soal pertama (gating di server, bukan di client).
router.get('/:id', requireAuth, (req, res) => {
  const attempt = db.prepare('SELECT * FROM attempts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId)
  if (!attempt) return res.status(404).json({ error: 'Hasil tidak ditemukan.' })

  const tryout = db.prepare('SELECT * FROM tryouts WHERE id = ?').get(attempt.tryout_id)
  const user = db.prepare('SELECT is_premium FROM users WHERE id = ?').get(req.userId)
  const pro = !!user.is_premium

  const questions = db.prepare(`
    SELECT q.* FROM questions q
    JOIN tryout_questions tq ON tq.question_id = q.id
    WHERE tq.tryout_id = ?
    ORDER BY tq.position ASC
  `).all(attempt.tryout_id)

  const answers = JSON.parse(attempt.answers)
  const FREE_EXPLAIN = 3

  const breakdown = questions.map((q, i) => {
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
})

// Riwayat semua attempt milik user, dipakai halaman statistik.
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT a.*, t.title as tryout_title FROM attempts a
    JOIN tryouts t ON t.id = a.tryout_id
    WHERE a.user_id = ?
    ORDER BY a.created_at DESC
  `).all(req.userId)
  res.json({
    attempts: rows.map(r => ({
      id: r.id, tryoutId: r.tryout_id, tryoutTitle: r.tryout_title,
      score: r.score, correct: r.correct_count, total: r.total_count,
      timeUsed: r.time_used_seconds, createdAt: r.created_at,
    })),
  })
})

export default router
