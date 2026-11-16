import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-ganti-di-produksi'

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Tidak ada token. Silakan login.' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.userId = payload.sub
    next()
  } catch {
    return res.status(401).json({ error: 'Token tidak valid atau kedaluwarsa. Silakan login kembali.' })
  }
}
