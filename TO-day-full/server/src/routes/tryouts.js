import { Router } from 'express'
import { db } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

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

function questionsForTryout(tryoutId) {
  return db.prepare(`
    SELECT q.* FROM questions q
    JOIN tryout_questions tq ON tq.question_id = q.id
    WHERE tq.tryout_id = ?
    ORDER BY tq.position ASC
  `).all(tryoutId)
}

// Daftar tryout (tanpa soal/jawaban) -- boleh dilihat siapa saja yang login,
// status terkunci ditentukan oleh is_premium milik tryout vs status akun.
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM tryouts').all()
  const list = rows.map(r => ({ ...rowToTryout(r), questionCount: questionsForTryout(r.id).length }))
  res.json({ tryouts: list })
})

// Ambil soal untuk dikerjakan. Jawaban & pembahasan TIDAK dikirim di sini
// supaya tidak bisa dilihat lewat devtools sebelum tryout selesai.
router.get('/:id/questions', requireAuth, (req, res) => {
  const tryout = db.prepare('SELECT * FROM tryouts WHERE id = ?').get(req.params.id)
  if (!tryout) return res.status(404).json({ error: 'Tryout tidak ditemukan.' })

  const user = db.prepare('SELECT is_premium FROM users WHERE id = ?').get(req.userId)
  if (tryout.is_premium && !user.is_premium) {
    return res.status(403).json({ error: 'Tryout ini khusus akun Premium.' })
  }

  const rawQuestions = questionsForTryout(tryout.id)
  const questions = rawQuestions.map(q => ({
    id: q.id,
    subtest: q.subtest_code,
    stem: q.stem,
    choices: q.choices ? JSON.parse(q.choices) : null,
  }))
  res.json({ tryout: rowToTryout(tryout), questions })
})

router.post('/:id/report', requireAuth, (req, res) => {
  const { questionId, reason } = req.body || {}
  if (!questionId || !reason) return res.status(400).json({ error: 'questionId dan reason wajib diisi.' })
  const q = db.prepare('SELECT id FROM questions WHERE id = ?').get(questionId)
  if (!q) return res.status(404).json({ error: 'Soal tidak ditemukan.' })
  db.prepare('INSERT INTO question_reports (user_id, question_id, reason) VALUES (?, ?, ?)')
    .run(req.userId, questionId, reason)
  res.status(201).json({ ok: true })
})

export default router
