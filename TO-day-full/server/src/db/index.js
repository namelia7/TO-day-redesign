import pg from 'pg'

const { Pool } = pg

const connectionString = process.env.DATABASE_URL || ''
// Railway (dan host lokal) memakai koneksi internal tanpa SSL. Host publik
// seperti Supabase/Railway public proxy membutuhkan SSL.
const needsSsl = connectionString !== '' && !/localhost|127\.0\.0\.1|railway\.internal/.test(connectionString)

export const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
})

export default pool
