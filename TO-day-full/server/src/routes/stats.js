import { Router } from 'express'
import { db } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Statistik dihitung dari data attempt + report yang nyata tersimpan di DB.
// - progres harian: jumlah sesi (attempt) dan skor rata-rata per hari
// - penguasaan subtes: persentase jawaban benar per subtes, dari seluruh attempt
router.get('/', requireAuth, (req, res) => {
  const attempts = db.prepare(`
    SELECT * FROM attempts WHERE user_id = ? ORDER BY created_at ASC
  `).all(req.userId)

  const byDay = new Map()
  for (const a of attempts) {
    const day = a.created_at.slice(0, 10) // YYYY-MM-DD
    const cur = byDay.get(day) || { date: day, sessions: 0, scoreSum: 0 }
    cur.sessions += 1
    cur.scoreSum += a.score
    byDay.set(day, cur)
  }
  const daily = [...byDay.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({ date: d.date, sessions: d.sessions, avg: Math.round(d.scoreSum / d.sessions) }))

  // Penguasaan per subtes: perlu melihat jawaban tiap attempt dibanding kunci.
  const subtests = db.prepare('SELECT code, name FROM subtests').all()
  const masteryAcc = Object.fromEntries(subtests.map(s => [s.code, { correct: 0, total: 0 }]))

  for (const a of attempts) {
    const tryoutQuestions = db.prepare(`
      SELECT q.* FROM questions q
      JOIN tryout_questions tq ON tq.question_id = q.id
      WHERE tq.tryout_id = ?
    `).all(a.tryout_id)
    const answers = JSON.parse(a.answers)
    for (const q of tryoutQuestions) {
      const given = answers[q.id]
      const ok = q.choices
        ? String(given) === String(q.answer)
        : String(given ?? '').trim().toLowerCase() === String(q.answer).trim().toLowerCase()
      const acc = masteryAcc[q.subtest_code]
      if (!acc) continue
      acc.total += 1
      if (ok) acc.correct += 1
    }
  }
  const mastery = subtests.map(s => {
    const acc = masteryAcc[s.code]
    const value = acc.total > 0 ? Math.round((acc.correct / acc.total) * 100) : 0
    return { code: s.code, name: s.name, value, hasData: acc.total > 0 }
  })

  const totalSessions = attempts.length
  const avgScore = attempts.length
    ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
    : 0

  res.json({ daily, mastery, totalSessions, avgScore })
})

export default router
