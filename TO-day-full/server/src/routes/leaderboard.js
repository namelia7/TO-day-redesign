import { Router } from 'express'
import { db } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Leaderboard dihitung dari skor TERTINGGI tiap user di seluruh attempt
// mereka (data nyata dari tabel attempts, bukan data hardcoded).
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT u.id as user_id, u.name, MAX(a.score) as best_score
    FROM attempts a
    JOIN users u ON u.id = a.user_id
    GROUP BY u.id
    ORDER BY best_score DESC
  `).all()

  const user = db.prepare('SELECT is_premium FROM users WHERE id = ?').get(req.userId)
  const pro = !!user.is_premium

  const board = rows.map((r, i) => ({
    rank: i + 1,
    name: r.name,
    score: r.best_score,
    me: r.user_id === req.userId,
  }))

  const myRank = board.find(b => b.me)?.rank ?? null
  const shown = pro ? board : board.filter((b, i) => i < 3 || b.me)

  res.json({ board: shown, myRank, total: board.length, isPremium: pro })
})

export default router
