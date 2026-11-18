// Menjalankan schema.sql ke database yang ditunjuk DATABASE_URL.
// Dipakai saat pertama kali menyiapkan database baru (mis. PostgreSQL Railway).
import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { pool } from './index.js'

const schemaUrl = new URL('./schema.sql', import.meta.url)

async function run() {
  const sql = await readFile(schemaUrl, 'utf8')
  await pool.query(sql)
  console.log('Migrasi selesai: skema database sudah terpasang.')
}

run()
  .catch(err => {
    console.error('Migrasi gagal:', err)
    process.exitCode = 1
  })
  .finally(() => pool.end())
