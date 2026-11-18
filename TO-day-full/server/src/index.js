import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import tryoutRoutes from './routes/tryouts.js'
import attemptRoutes from './routes/attempts.js'
import leaderboardRoutes from './routes/leaderboard.js'
import statsRoutes from './routes/stats.js'
import paymentRoutes from './routes/payments.js'
import adminRoutes from './routes/admin.js'
import { runStartupTasks } from './db/bootstrap.js'

const app = express()
const PORT = process.env.PORT || 4000
const FRONTEND_URL = (process.env.FRONTEND_URL || '').replace(/\/$/, '')

app.set('trust proxy', 1)
app.use(cors(FRONTEND_URL ? { origin: FRONTEND_URL } : {}))
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ ok: true, name: 'TO-Day API' }))

app.use('/api/auth', authRoutes)
app.use('/api/tryouts', tryoutRoutes)
app.use('/api/attempts', attemptRoutes)
app.use('/api/leaderboard', leaderboardRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/admin', adminRoutes)

app.use((req, res) => res.status(404).json({ error: 'Rute tidak ditemukan.' }))

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' })
})

try {
  await runStartupTasks()
} catch (err) {
  console.error('Gagal menyiapkan database:', err)
  process.exit(1)
}

app.listen(PORT, () => {
  console.log(`TO-Day API berjalan di http://localhost:${PORT}`)
})
