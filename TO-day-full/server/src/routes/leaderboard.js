import { Router } from 'express'
import { pool } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// Leaderboard dihitung dari skor TERTINGGI tiap user di seluruh attempt
// mereka (data nyata dari tabel attempts, bukan data hardcoded).
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT u.id as user_id, u.username, u.name, MAX(a.score) as best_score
    FROM attempts a
    JOIN users u ON u.id = a.user_id
    GROUP BY u.id, u.username, u.name
    ORDER BY best_score DESC
  `)

  const userResult = await pool.query('SELECT is_premium FROM users WHERE id = $1', [req.userId])
  const pro = !!userResult.rows[0]?.is_premium

  const board = result.rows.map((r, i) => ({
    rank: i + 1,
    user_id: r.user_id,
    username: r.username || `user${r.user_id}`,
    name: r.name,
    score: r.best_score,
    me: r.user_id === req.userId,
  }))

  const myRank = board.find(b => b.me)?.rank ?? null
  const shown = pro ? board : board.filter((b, i) => i < 3 || b.me)

  res.json({ board: shown, myRank, total: board.length, isPremium: pro })
}))

export default router
