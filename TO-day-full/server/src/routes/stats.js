import { Router } from 'express'
import { pool } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

function toDay(value) {
  if (!value) return ''
  return (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10)
}

// Statistik dihitung dari data attempt + report yang nyata tersimpan di DB.
// - progres harian: jumlah sesi (attempt) dan skor rata-rata per hari
// - penguasaan subtes: persentase jawaban benar per subtes, dari seluruh attempt
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const attemptsResult = await pool.query(
    'SELECT * FROM attempts WHERE user_id = $1 ORDER BY created_at ASC',
    [req.userId]
  )
  const attempts = attemptsResult.rows

  const byDay = new Map()
  for (const a of attempts) {
    const day = toDay(a.created_at) // YYYY-MM-DD
    const cur = byDay.get(day) || { date: day, sessions: 0, scoreSum: 0 }
    cur.sessions += 1
    cur.scoreSum += a.score
    byDay.set(day, cur)
  }
  const daily = [...byDay.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({ date: d.date, sessions: d.sessions, avg: Math.round(d.scoreSum / d.sessions) }))

  // Penguasaan per subtes: perlu melihat jawaban tiap attempt dibanding kunci.
  const subtestsResult = await pool.query('SELECT code, name FROM subtests')
  const subtests = subtestsResult.rows
  const masteryAcc = Object.fromEntries(subtests.map(s => [s.code, { correct: 0, total: 0 }]))

  for (const a of attempts) {
    const tryoutQuestions = await pool.query(`
      SELECT q.* FROM questions q
      JOIN tryout_questions tq ON tq.question_id = q.id
      WHERE tq.tryout_id = $1
    `, [a.tryout_id])
    const answers = JSON.parse(a.answers)
    for (const q of tryoutQuestions.rows) {
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
}))

export default router
