import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db/index.js'
import { signToken, requireAuth } from '../middleware/auth.js'

const router = Router()

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

function dateOnly(value) {
  if (!value) return null
  return (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10)
}

function publicUser(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    isPremium: !!row.is_premium,
    premiumUntil: dateOnly(row.premium_until),
    isAdmin: !!row.is_admin,
    school: row.school,
    ptn: row.ptn,
    prodi: row.prodi,
    passing: row.passing_grade != null ? String(row.passing_grade) : '',
  }
}

router.post('/register', asyncHandler(async (req, res) => {
  const { name, username, email, password } = req.body || {}
  if (!name || !username || !email || !password) {
    return res.status(400).json({ error: 'Nama, username, email, dan password wajib diisi.' })
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password minimal 6 karakter.' })
  }

  const normalizedUsername = String(username).trim().toLowerCase()
  if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
    return res.status(400).json({
      error: 'Username harus 3-20 karakter dan hanya boleh berisi huruf, angka, atau underscore.',
    })
  }

  const normalizedEmail = String(email).trim().toLowerCase()
  const existingEmail = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail])
  if (existingEmail.rowCount > 0) {
    return res.status(409).json({ error: 'Email sudah terdaftar. Silakan login.' })
  }

  const existingUsername = await pool.query(
    'SELECT id FROM users WHERE LOWER(username) = $1',
    [normalizedUsername]
  )
  if (existingUsername.rowCount > 0) {
    return res.status(409).json({ error: 'Username sudah dipakai. Pilih username lain.' })
  }

  const hash = bcrypt.hashSync(password, 10)
  const inserted = await pool.query(`
    INSERT INTO users (name, username, email, password_hash, is_premium)
    VALUES ($1, $2, $3, $4, FALSE)
    RETURNING *
  `, [name.trim(), normalizedUsername, normalizedEmail, hash])

  const user = inserted.rows[0]
  const token = signToken(user)
  res.status(201).json({ token, user: publicUser(user) })
}))

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' })
  }
  const normalizedEmail = String(email).trim().toLowerCase()
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [normalizedEmail])
  const user = result.rows[0]
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email atau password salah.' })
  }
  const token = signToken(user)
  res.json({ token, user: publicUser(user) })
}))

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.userId])
  const user = result.rows[0]
  if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' })
  res.json({ user: publicUser(user) })
}))

router.patch('/me', requireAuth, asyncHandler(async (req, res) => {
  const { school, ptn, prodi, passing } = req.body || {}
  const result = await pool.query(`
    UPDATE users SET school = $1, ptn = $2, prodi = $3, passing_grade = $4
    WHERE id = $5
    RETURNING *
  `, [school ?? null, ptn ?? null, prodi ?? null, passing ? Number(passing) : null, req.userId])
  res.json({ user: publicUser(result.rows[0]) })
}))

export { publicUser }
export default router
