// Seed database dengan subtes, soal, tryout, akun demo, dan riwayat latihan.
// Soal di sini adalah soal latihan bergaya UTBK, bukan soal UTBK resmi.
import 'dotenv/config'
import { pathToFileURL } from 'node:url'
import bcrypt from 'bcryptjs'
import { pool } from './index.js'
import { SUBTESTS, TRYOUTS, QUESTIONS } from './seed-data.js'

// Akun untuk presentasi/demo. Password hanya untuk demo lokal; seed ini
// otomatis dilewati di produksi kecuali SEED_DEMO_ACCOUNTS=true.
const DEMO_ACCOUNTS = [
  {
    label: 'Admin',
    name: 'Admin TO-Day',
    username: 'admin',
    email: 'admin@today.demo',
    password: 'admin1234',
    isAdmin: true,
    isPremium: false,
    school: null,
    ptn: null,
    prodi: null,
    passing: null,
  },
  {
    label: 'Premium',
    name: 'Siswa Premium',
    username: 'premium',
    email: 'premium@today.demo',
    password: 'premium1234',
    isAdmin: false,
    isPremium: true,
    school: 'SMA Negeri 1 Jakarta',
    ptn: 'Institut Teknologi Bandung',
    prodi: 'Teknik Informatika',
    passing: 650,
  },
  {
    label: 'Gratis',
    name: 'Siswa Gratis',
    username: 'siswa',
    email: 'siswa@today.demo',
    password: 'siswa1234',
    isAdmin: false,
    isPremium: false,
    school: 'SMA Negeri 2 Bandung',
    ptn: 'Universitas Indonesia',
    prodi: 'Ilmu Komputer',
    passing: 700,
  },
]

// Riwayat latihan untuk akun demo. Accuracy adalah target kasar per subtes;
// pola jawaban dibuat deterministik supaya statistik tetap variatif setiap seed.
const DEMO_ACTIVITY = [
  {
    email: 'premium@today.demo',
    attempts: [
      { tryout: 'utbk-1', daysAgo: 13, timeUsed: 2200, accuracy: { PU: 0.45, PM: 0.35, BIND: 0.55, BING: 0.45 } },
      { tryout: 'sub-pm', daysAgo: 12, timeUsed: 480, accuracy: { PM: 0.40 } },
      { tryout: 'sub-bind', daysAgo: 11, timeUsed: 420, accuracy: { BIND: 0.67 } },
      { tryout: 'utbk-2', daysAgo: 9, timeUsed: 1900, accuracy: { PU: 0.65, PM: 0.55, BIND: 0.75, BING: 0.60 } },
      { tryout: 'sub-pu', daysAgo: 8, timeUsed: 520, accuracy: { PU: 0.72 } },
      { tryout: 'sub-bing', daysAgo: 7, timeUsed: 470, accuracy: { BING: 0.50 } },
      { tryout: 'utbk-3', daysAgo: 6, timeUsed: 2100, accuracy: { PU: 0.78, PM: 0.68, BIND: 0.84, BING: 0.74 } },
      { tryout: 'sub-pm', daysAgo: 4, timeUsed: 450, accuracy: { PM: 0.67 } },
      { tryout: 'utbk-1', daysAgo: 3, timeUsed: 1800, accuracy: { PU: 0.82, PM: 0.76, BIND: 0.80, BING: 0.82 } },
      { tryout: 'sub-bind', daysAgo: 2, timeUsed: 380, accuracy: { BIND: 0.67 } },
      { tryout: 'utbk-2', daysAgo: 1, timeUsed: 1700, accuracy: { PU: 0.92, PM: 0.84, BIND: 0.85, BING: 0.88 } },
      { tryout: 'utbk-3', daysAgo: 0, timeUsed: 1600, accuracy: { PU: 0.96, PM: 0.92, BIND: 0.75, BING: 0.94 } },
    ],
  },
  {
    email: 'siswa@today.demo',
    attempts: [
      { tryout: 'sub-pm', daysAgo: 10, timeUsed: 700, accuracy: { PM: 0.35 } },
      { tryout: 'utbk-1', daysAgo: 5, timeUsed: 2300, accuracy: { PU: 0.50, PM: 0.33, BIND: 0.55, BING: 0.45 } },
      { tryout: 'sub-bind', daysAgo: 1, timeUsed: 650, accuracy: { BIND: 0.60 } },
    ],
  },
  {
    email: 'johndoe@gmail.com',
    attempts: [
      { tryout: 'utbk-2', daysAgo: 12, timeUsed: 2000, accuracy: { PU: 0.70, PM: 0.62, BIND: 0.68, BING: 0.58 } },
      { tryout: 'sub-pu', daysAgo: 8, timeUsed: 600, accuracy: { PU: 0.85 } },
      { tryout: 'utbk-3', daysAgo: 3, timeUsed: 1800, accuracy: { PU: 0.64, PM: 0.72, BIND: 0.70, BING: 0.66 } },
      { tryout: 'sub-bing', daysAgo: 0, timeUsed: 550, accuracy: { BING: 0.70 } },
    ],
  },
]

function questionsForTryout(t) {
  if (t.subtest) return QUESTIONS.filter(q => q.subtest === t.subtest)
  return QUESTIONS // tryout tipe 'utbk' memakai semua soal (demo)
}

function wrongAnswer(question, seed) {
  if (question.choices) {
    const total = question.choices.length
    let index = (Number(question.answer) + 1 + (seed % Math.max(total - 1, 1))) % total
    if (String(index) === String(question.answer)) index = (index + 1) % total
    return String(index)
  }
  const numeric = Number(question.answer)
  if (Number.isFinite(numeric)) return String(numeric + 1 + (seed % 3))
  if (String(question.answer).toLowerCase() === 'kamis') return 'senin'
  return 'tidak tahu'
}

function buildSeedAttempt(spec, seedIndex) {
  const tryout = TRYOUTS.find(t => t.id === spec.tryout)
  if (!tryout) throw new Error(`Tryout demo tidak ditemukan: ${spec.tryout}`)

  const questions = questionsForTryout(tryout)
  const answers = {}
  const counters = {}
  let correct = 0

  questions.forEach((q, questionIndex) => {
    const subIndex = counters[q.subtest] || 0
    counters[q.subtest] = subIndex + 1

    const accuracy = spec.accuracy[q.subtest] ?? 0.6
    const threshold = Math.floor(accuracy * 10)
    const isCorrect = ((subIndex * 7 + seedIndex * 3 + questionIndex) % 10) < threshold

    if (isCorrect) {
      answers[q.id] = q.answer
      correct += 1
    } else {
      answers[q.id] = wrongAnswer(q, seedIndex + questionIndex)
    }
  })

  const total = questions.length
  const score = Math.round(200 + (correct / total) * 800)
  const createdAt = new Date(Date.now() - spec.daysAgo * 24 * 60 * 60 * 1000 - (seedIndex % 5) * 60 * 60 * 1000)

  return {
    tryoutId: tryout.id,
    answers,
    score,
    correct,
    total,
    timeUsed: Math.min(spec.timeUsed, tryout.duration),
    createdAt,
  }
}

async function seedDemoActivity() {
  const emails = DEMO_ACTIVITY.map(group => group.email)
  const usersResult = await pool.query(
    'SELECT id, email FROM users WHERE email = ANY($1)',
    [emails]
  )
  const usersByEmail = new Map(usersResult.rows.map(row => [row.email, row]))
  const userIds = usersResult.rows.map(row => row.id)

  // Riwayat akun demo di-reset supaya seed idempotent. Akun lain tidak disentuh.
  if (userIds.length > 0) {
    await pool.query('DELETE FROM attempts WHERE user_id = ANY($1::int[])', [userIds])
  }

  let seedIndex = 0
  let inserted = 0
  for (const group of DEMO_ACTIVITY) {
    const user = usersByEmail.get(group.email)
    if (!user) continue

    for (const spec of group.attempts) {
      const attempt = buildSeedAttempt(spec, seedIndex)
      await pool.query(
        `INSERT INTO attempts
           (user_id, tryout_id, answers, score, correct_count, total_count, time_used_seconds, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          user.id,
          attempt.tryoutId,
          JSON.stringify(attempt.answers),
          attempt.score,
          attempt.correct,
          attempt.total,
          attempt.timeUsed,
          attempt.createdAt,
        ]
      )
      seedIndex += 1
      inserted += 1
    }
  }

  return inserted
}

async function seed() {
  for (const [code, name] of SUBTESTS) {
    await pool.query(
      'INSERT INTO subtests (code, name) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING',
      [code, name]
    )
  }

  for (const q of QUESTIONS) {
    await pool.query(
      `INSERT INTO questions (id, subtest_code, stem, choices, answer, explain)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         subtest_code = EXCLUDED.subtest_code,
         stem = EXCLUDED.stem,
         choices = EXCLUDED.choices,
         answer = EXCLUDED.answer,
         explain = EXCLUDED.explain`,
      [q.id, q.subtest, q.stem, q.choices ? JSON.stringify(q.choices) : null, q.answer, q.explain]
    )
  }

  for (const t of TRYOUTS) {
    await pool.query(
      `INSERT INTO tryouts (id, title, type, subtest_code, is_premium, duration_seconds, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         type = EXCLUDED.type,
         subtest_code = EXCLUDED.subtest_code,
         is_premium = EXCLUDED.is_premium,
         duration_seconds = EXCLUDED.duration_seconds,
         description = EXCLUDED.description`,
      [t.id, t.title, t.type, t.subtest, Boolean(t.premium), t.duration, t.desc]
    )
    await pool.query('DELETE FROM tryout_questions WHERE tryout_id = $1', [t.id])
    const qs = questionsForTryout(t)
    for (let i = 0; i < qs.length; i += 1) {
      await pool.query(
        `INSERT INTO tryout_questions (tryout_id, question_id, position)
         VALUES ($1, $2, $3)`,
        [t.id, qs[i].id, i]
      )
    }
  }

  // Akun demo untuk presentasi. Jangan dibuat di produksi karena password-nya
  // publik; script demo:local menyalakan SEED_DEMO_ACCOUNTS=true.
  const shouldSeedDemo = process.env.SEED_DEMO_ACCOUNTS === 'true'
    || (process.env.NODE_ENV !== 'production' && process.env.SKIP_DEMO_USER !== 'true')
  if (!shouldSeedDemo) {
    console.log('Akun demo dilewati (produksi / SKIP_DEMO_USER=true).')
    console.log('Seed selesai.')
    return
  }

  for (const account of DEMO_ACCOUNTS) {
    const hash = await bcrypt.hash(account.password, 10)
    const premiumUntil = account.isPremium
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : null
    await pool.query(
      `INSERT INTO users
         (name, username, email, password_hash, is_premium, premium_until, is_admin, school, ptn, prodi, passing_grade)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         username = EXCLUDED.username,
         password_hash = EXCLUDED.password_hash,
         is_premium = EXCLUDED.is_premium,
         premium_until = EXCLUDED.premium_until,
         is_admin = EXCLUDED.is_admin,
         school = EXCLUDED.school,
         ptn = EXCLUDED.ptn,
         prodi = EXCLUDED.prodi,
         passing_grade = EXCLUDED.passing_grade`,
      [
        account.name,
        account.username,
        account.email,
        hash,
        account.isPremium,
        premiumUntil,
        account.isAdmin,
        account.school,
        account.ptn,
        account.prodi,
        account.passing,
      ]
    )
  }

  const legacy = await pool.query("SELECT id FROM users WHERE email = 'johndoe@gmail.com'")
  if (legacy.rowCount > 0) {
    await pool.query(
      `UPDATE users SET username = 'johndoe'
        WHERE id = $1
          AND NOT EXISTS (SELECT 1 FROM users WHERE LOWER(username) = 'johndoe' AND id <> $1)`,
      [legacy.rows[0].id]
    )
  }

  const activityCount = await seedDemoActivity()

  console.log('Akun demo siap:')
  for (const account of DEMO_ACCOUNTS) {
    console.log(`  ${account.label.padEnd(8)}: @${account.username} | ${account.email} / ${account.password}`)
  }
  console.log(`Riwayat demo: ${activityCount} attempt tersimpan untuk akun premium/siswa/johndoe.`)

  console.log('Seed selesai.')
}

export { seed }

// Jalankan sebagai script (`npm run seed`), bukan saat di-import server.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed()
    .catch(err => {
      console.error(err)
      process.exitCode = 1
    })
    .finally(() => pool.end())
}
