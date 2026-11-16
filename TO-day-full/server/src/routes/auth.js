import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { db } from '../db/index.js'
import { signToken, requireAuth } from '../middleware/auth.js'

const router = Router()

function publicUser(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    isPremium: !!row.is_premium,
    premiumUntil: row.premium_until,
    school: row.school,
    ptn: row.ptn,
    prodi: row.prodi,
    passing: row.passing_grade != null ? String(row.passing_grade) : '',
  }
}

router.post('/register', (req, res) => {
  const { name, email, password } = req.body || {}
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nama, email, dan password wajib diisi.' })
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password minimal 6 karakter.' })
  }
  const normalizedEmail = String(email).trim().toLowerCase()
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail)
  if (existing) {
    return res.status(409).json({ error: 'Email sudah terdaftar. Silakan login.' })
  }
  const hash = bcrypt.hashSync(password, 10)
  const info = db.prepare(`
    INSERT INTO users (name, email, password_hash, is_premium)
    VALUES (?, ?, ?, 0)
  `).run(name.trim(), normalizedEmail, hash)

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid)
  const token = signToken(user)
  res.status(201).json({ token, user: publicUser(user) })
})

router.post('/login', (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' })
  }
  const normalizedEmail = String(email).trim().toLowerCase()
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail)
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email atau password salah.' })
  }
  const token = signToken(user)
  res.json({ token, user: publicUser(user) })
})

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId)
  if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' })
  res.json({ user: publicUser(user) })
})

router.patch('/me', requireAuth, (req, res) => {
  const { school, ptn, prodi, passing } = req.body || {}
  db.prepare(`
    UPDATE users SET school = ?, ptn = ?, prodi = ?, passing_grade = ? WHERE id = ?
  `).run(school ?? null, ptn ?? null, prodi ?? null, passing ? Number(passing) : null, req.userId)
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId)
  res.json({ user: publicUser(user) })
})

export { publicUser }
export default router
