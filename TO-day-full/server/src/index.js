import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import tryoutRoutes from './routes/tryouts.js'
import attemptRoutes from './routes/attempts.js'
import leaderboardRoutes from './routes/leaderboard.js'
import statsRoutes from './routes/stats.js'
import paymentRoutes from './routes/payments.js'

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ ok: true, name: 'TO-Day API' }))

app.use('/api/auth', authRoutes)
app.use('/api/tryouts', tryoutRoutes)
app.use('/api/attempts', attemptRoutes)
app.use('/api/leaderboard', leaderboardRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/payments', paymentRoutes)

app.use((req, res) => res.status(404).json({ error: 'Rute tidak ditemukan.' }))

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' })
})

app.listen(PORT, () => {
  console.log(`TO-Day API berjalan di http://localhost:${PORT}`)
})
