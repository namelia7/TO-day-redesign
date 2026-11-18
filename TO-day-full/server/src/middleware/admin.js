import { timingSafeEqual } from 'node:crypto'

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

export function requireAdmin(req, res, next) {
  const configured = process.env.ADMIN_TOKEN || ''
  if (!configured) {
    return res.status(503).json({ error: 'Halaman admin belum dikonfigurasi (ADMIN_TOKEN kosong).' })
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

  next()
}
