import { pool } from '../db/index.js'

// Memperpanjang premium satu bulan dari tanggal aktif terakhir (atau sekarang).
// Harus dipanggil di dalam transaksi database supaya bisa atomik dengan
// perubahan status pembayaran.
export async function grantPremium(client, userId) {
  await client.query(
    `UPDATE users
       SET is_premium = TRUE,
           premium_until = GREATEST(COALESCE(premium_until, NOW()), NOW()) + INTERVAL '1 month'
     WHERE id = $1`,
    [userId]
  )

  const result = await client.query(
    `SELECT is_premium, to_char(premium_until, 'YYYY-MM-DD') AS premium_until
       FROM users WHERE id = $1`,
    [userId]
  )
  const user = result.rows[0]
  return {
    isPremium: !!user?.is_premium,
    premiumUntil: user?.premium_until ?? null,
  }
}

// Versi mandiri (mengelola transaksi sendiri), dipakai di luar konteks webhook.
export async function activatePremium(userId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const info = await grantPremium(client, userId)
    await client.query('COMMIT')
    return info
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
