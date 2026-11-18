import { readFile } from 'node:fs/promises'
import { pool } from './index.js'
import { seed } from './seed.js'

const schemaUrl = new URL('./schema.sql', import.meta.url)

// Menyiapkan database tanpa perlu shell/CLI terpisah:
// - Schema otomatis dijalankan di produksi atau jika RUN_MIGRATIONS=true.
//   Semua statement memakai IF NOT EXISTS sehingga aman diulang.
// - Seed (soal/tryout) hanya jika RUN_SEED=true; idempotent.
export async function runStartupTasks() {
  const shouldMigrate = process.env.RUN_MIGRATIONS === 'true' || process.env.NODE_ENV === 'production'
  const shouldSeed = process.env.RUN_SEED === 'true'

  if (shouldMigrate) {
    const sql = await readFile(schemaUrl, 'utf8')
    await pool.query(sql)
    console.log('Skema database dipastikan terpasang.')
  }

  if (shouldSeed) {
    console.log('Menjalankan seed karena RUN_SEED=true...')
    await seed()
  }
}
