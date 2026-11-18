import { timingSafeEqual } from 'node:crypto'
import { pool } from '../db/index.js'
import { verifyToken } from './auth.js'

// Rate-limit sederhana per IP untuk mencegah brute force token admin.
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 20
const attempts = new Map()

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a))
  const bufB = Buffer.from(String(b))
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

function tooManyAttempts(ip) {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 0, resetAt: now + WINDOW_MS })
    return false
  }
  return entry.count >= MAX_ATTEMPTS
}

function recordFailure(ip) {
  const entry = attempts.get(ip)
  if (entry) entry.count += 1
}

async function jwtAdminStatus(req) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) return 'none'
  try {
    const payload = verifyToken(header.slice(7))
    const result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [payload.sub])
    if (!result.rows[0]) return 'invalid'
    return result.rows[0].is_admin ? 'admin' : 'forbidden'
  } catch {
    return 'invalid'
  }
}

export async function requireAdmin(req, res, next) {
  try {
    const jwtStatus = await jwtAdminStatus(req)
    if (jwtStatus === 'admin') return next()
    if (jwtStatus === 'forbidden') {
      return res.status(403).json({ error: 'Akun ini bukan admin.' })
    }

    const configured = process.env.ADMIN_TOKEN || ''
    if (!configured) {
      return res.status(401).json({ error: 'Login sebagai admin atau isi ADMIN_TOKEN.' })
    }

    const ip = req.ip || req.socket?.remoteAddress || 'unknown'
    if (tooManyAttempts(ip)) {
      return res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi nanti.' })
    }

    const token = req.headers['x-admin-token']
    if (typeof token !== 'string' || !safeEqual(configured, token)) {
      recordFailure(ip)
      return res.status(401).json({ error: 'Token admin tidak valid.' })
    }

    return next()
  } catch (err) {
    return next(err)
  }
}
