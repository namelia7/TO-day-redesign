// Seed database dengan subtes, soal, tryout, akun demo, dan riwayat latihan.
// Soal di sini adalah soal latihan bergaya UTBK, bukan soal UTBK resmi.
import 'dotenv/config'
import { pathToFileURL } from 'node:url'
import bcrypt from 'bcryptjs'
import { pool } from './index.js'

const SUBTESTS = [
  ['PU', 'Penalaran Umum'],
  ['PM', 'Penalaran Matematika'],
  ['BIND', 'Bahasa Indonesia'],
  ['BING', 'Bahasa Inggris'],
]

const QUESTIONS = [
  { id: 'q1', subtest: 'PU', stem: 'Semua atlet berlatih setiap hari. Rani berlatih setiap hari. Kesimpulan yang pasti benar adalah...', choices: ['Rani adalah atlet', 'Rani belum tentu atlet', 'Rani bukan atlet', 'Semua yang berlatih adalah atlet'], answer: '1', explain: 'Premis hanya menyatakan bahwa atlet berlatih setiap hari, bukan sebaliknya. Orang yang berlatih setiap hari belum tentu atlet, jadi Rani belum tentu atlet.' },
  { id: 'q2', subtest: 'PU', stem: 'Lanjutkan deret berikut: 2, 6, 18, 54, ... (isi dengan angka)', choices: null, answer: '162', explain: 'Setiap suku dikali 3. Suku berikutnya adalah 54 x 3 = 162.' },
  { id: 'q3', subtest: 'PM', stem: 'Jika 2x + 3 = 11, maka nilai x adalah...', choices: ['3', '4', '5', '6'], answer: '1', explain: 'Pindahkan 3 ke ruas kanan sehingga 2x = 8, lalu bagi 2 menjadi x = 4.' },
  { id: 'q4', subtest: 'PM', stem: 'Nilai dari 3 pangkat 2 ditambah 4 pangkat 2 adalah... (isi dengan angka)', choices: null, answer: '25', explain: '3 pangkat 2 sama dengan 9 dan 4 pangkat 2 sama dengan 16. Jumlahnya 25.' },
  { id: 'q5', subtest: 'PM', stem: 'Sebuah dadu dilempar satu kali. Peluang muncul mata dadu genap adalah...', choices: ['1/6', '1/3', '1/2', '2/3'], answer: '2', explain: 'Mata dadu genap ada 3 (2, 4, 6) dari 6 kemungkinan, sehingga peluangnya 3/6 = 1/2.' },
  { id: 'q6', subtest: 'BIND', stem: 'Manakah kalimat yang efektif?', choices: ['Para hadirin-hadirin dimohon berdiri.', 'Hadirin dimohon berdiri.', 'Para hadirin sekalian dimohon untuk berdiri.', 'Dimohon kepada para hadirin-hadirin berdiri.'], answer: '1', explain: 'Kalimat efektif tidak boleh pleonasme. "Para" sudah menyatakan jamak sehingga tidak perlu diulang dengan bentuk ulang atau kata "sekalian".' },
  { id: 'q7', subtest: 'BING', stem: 'She ___ to school every day.', choices: ['go', 'goes', 'going', 'gone'], answer: '1', explain: 'Subjek orang ketiga tunggal (she) pada simple present memakai kata kerja dengan akhiran -s atau -es, jadi "goes".' },
  { id: 'q8', subtest: 'PU', stem: 'Jika hari ini Senin, hari apakah 10 hari lagi? (isi dengan nama hari)', choices: null, answer: 'kamis', explain: '10 dibagi 7 bersisa 3. Tiga hari setelah Senin adalah Kamis.' },
  { id: 'q9', subtest: 'PU', stem: 'Semua mahasiswa yang mengikuti olimpiade adalah siswa yang rajin. Sebagian siswa yang rajin mengikuti kegiatan debat. Tidak ada peserta debat yang memiliki waktu tidur kurang dari tujuh jam. Kesimpulan yang pasti benar adalah...', choices: ['Semua mahasiswa olimpiade tidur kurang dari tujuh jam', 'Sebagian siswa rajin tidur minimal tujuh jam', 'Semua peserta debat adalah mahasiswa olimpiade', 'Sebagian mahasiswa olimpiade mengikuti debat'], answer: '1', explain: 'Sebagian siswa rajin adalah peserta debat. Karena tidak ada peserta debat yang tidur kurang dari tujuh jam, sebagian siswa rajin tersebut pasti tidur minimal tujuh jam.' },
  { id: 'q10', subtest: 'PU', stem: 'Jika tim A menang, tim B tidak masuk final. Jika tim B tidak masuk final, tim C menjadi juara. Tim C tidak menjadi juara. Kesimpulan yang pasti benar adalah...', choices: ['Tim A menang', 'Tim B tidak masuk final', 'Tim A tidak menang', 'Tim C masuk final'], answer: '2', explain: 'Dari tim C tidak juara, berlaku kontraposisi: tim B masuk final. Dari tim B masuk final, berlaku kontraposisi premis pertama: tim A tidak menang.' },
  { id: 'q11', subtest: 'PU', stem: 'Perhatikan pola berikut: 3, 6, 11, 18, 27, ... Bilangan berikutnya adalah... (isi dengan angka)', choices: null, answer: '38', explain: 'Selisih antarsuku bertambah dua: 3, 5, 7, 9, lalu 11. Jadi 27 + 11 = 38.' },
  { id: 'q12', subtest: 'PU', stem: 'Dalam sebuah kelas terdapat 40 siswa. Sebanyak 25 siswa menyukai matematika, 20 siswa menyukai fisika, dan 8 siswa menyukai keduanya. Banyak siswa yang tidak menyukai matematika maupun fisika adalah...', choices: ['3', '5', '8', '12'], answer: '0', explain: 'Jumlah yang menyukai minimal satu pelajaran = 25 + 20 - 8 = 37. Sisanya 40 - 37 = 3 siswa tidak menyukai keduanya.' },
  { id: 'q13', subtest: 'PM', stem: 'Rata-rata delapan data adalah 15. Setelah dua data terbesar dihapus, rata-rata enam data yang tersisa adalah 12. Jumlah dua data yang dihapus adalah...', choices: ['36', '42', '48', '54'], answer: '2', explain: 'Jumlah awal = 8 x 15 = 120. Jumlah setelah dua data dihapus = 6 x 12 = 72. Jumlah dua data yang dihapus = 120 - 72 = 48.' },
  { id: 'q14', subtest: 'PM', stem: 'Jika log2(x) + log2(x - 2) = 3, nilai x yang memenuhi adalah...', choices: ['2', '4', '6', '8'], answer: '1', explain: 'Gabungkan logaritma: log2(x(x - 2)) = 3, sehingga x(x - 2) = 8. Persamaan x^2 - 2x - 8 = 0 menghasilkan x = 4 atau x = -2. Karena numerus harus positif, x = 4.' },
  { id: 'q15', subtest: 'PM', stem: 'Lingkaran dengan persamaan x^2 + y^2 - 6x + 4y - 12 = 0 memiliki jari-jari...', choices: ['3', '4', '5', '6'], answer: '2', explain: 'Ubah ke bentuk pusat: (x - 3)^2 + (y + 2)^2 = 25. Pusatnya (3, -2) dan jari-jarinya akar 25, yaitu 5.' },
  { id: 'q16', subtest: 'PM', stem: 'Dalam sebuah kotak terdapat 5 bola merah dan 3 bola biru. Dua bola diambil sekaligus secara acak. Peluang terambil keduanya bola merah adalah...', choices: ['5/28', '5/14', '10/21', '3/14'], answer: '1', explain: 'Banyak cara memilih 2 dari 5 bola merah adalah C(5,2) = 10. Banyak cara memilih 2 dari 8 bola adalah C(8,2) = 28. Peluangnya 10/28 = 5/14.' },
  { id: 'q17', subtest: 'BIND', stem: 'Bacalah kutipan berikut. "Kebijakan jam belajar tambahan di sekolah sering kali dianggap solusi instan untuk meningkatkan prestasi. Padahal, tanpa perbaikan kualitas pengajaran dan istirahat yang cukup, penambahan waktu belajar justru dapat menurunkan konsentrasi siswa." Gagasan utama kutipan tersebut adalah...', choices: ['Jam belajar tambahan selalu meningkatkan prestasi siswa', 'Kualitas pengajaran dan istirahat lebih penting daripada sekadar menambah jam belajar', 'Siswa tidak perlu mengikuti jam belajar tambahan', 'Sekolah sebaiknya menghapus semua kebijakan belajar'], answer: '1', explain: 'Kutipan menolak anggapan bahwa menambah jam belajar selalu menyelesaikan masalah. Penulis menekankan kualitas pengajaran dan istirahat yang cukup.' },
  { id: 'q18', subtest: 'BIND', stem: 'Penulisan kalimat yang paling sesuai dengan kaidah bahasa Indonesia adalah...', choices: ['Ia berkata, bahwa besok akan datang.', 'Ia berkata bahwa besok akan datang.', 'Ia berkata: bahwa besok akan datang.', 'Ia berkata, "bahwa besok akan datang."'], answer: '1', explain: 'Kata "bahwa" berfungsi sebagai konjungsi penanda klausa, sehingga tidak didahului koma atau titik dua dalam kalimat tersebut.' },
  { id: 'q19', subtest: 'BIND', stem: 'Urutan kalimat yang paling padu untuk paragraf tentang literasi digital adalah... (1) Namun, kemampuan memilah informasi belum tentu mengikuti kecepatan akses. (2) Akses internet di Indonesia terus meningkat. (3) Oleh karena itu, literasi digital perlu diajarkan sejak dini. (4) Banyak pengguna belum mampu membedakan fakta dan hoaks.', choices: ['2 - 1 - 4 - 3', '2 - 4 - 3 - 1', '1 - 2 - 4 - 3', '4 - 2 - 1 - 3'], answer: '0', explain: 'Kalimat (2) menjadi pembuka, diikuti pertentangan (1), penjelasan (4), lalu kesimpulan (3). Urutan 2-1-4-3 paling runtut.' },
  { id: 'q20', subtest: 'BIND', stem: 'Kata "mengakar" dalam kalimat "Kebiasaan membaca perlu mengakar dalam kehidupan siswa" bermakna...', choices: ['tumbuh seperti akar tanaman', 'menjadi kebiasaan yang kuat', 'menempel pada benda', 'berasal dari keluarga'], answer: '1', explain: 'Dalam konteks tersebut, "mengakar" dipakai secara kiasan untuk menggambarkan kebiasaan yang kuat dan tertanam.' },
  { id: 'q21', subtest: 'BING', stem: 'Read the passage. "Although online learning offers flexibility, it requires students to manage their time independently. Those who lack self-regulation often struggle, not because the material is too difficult, but because they postpone tasks." What can be inferred from the passage?', choices: ['Online learning is always easier than face-to-face learning', 'Time management is unrelated to success in online learning', 'Self-regulation is important for success in online learning', 'Students who struggle online always find the material too difficult'], answer: '2', explain: 'The passage explicitly links lack of self-regulation to struggling online, so self-regulation is important for success.' },
  { id: 'q22', subtest: 'BING', stem: 'If the school ___ more digital resources, students would be able to learn more independently.', choices: ['provides', 'provided', 'will provide', 'has provided'], answer: '1', explain: 'This is a second conditional sentence. The if-clause uses the past simple ("provided") and the main clause uses "would + verb".' },
  { id: 'q23', subtest: 'BING', stem: 'The word "scarce" in "Clean water is becoming scarce in many regions" is closest in meaning to...', choices: ['abundant', 'limited', 'polluted', 'expensive'], answer: '1', explain: '"Scarce" means not enough or in short supply, so "limited" is the closest meaning.' },
  { id: 'q24', subtest: 'BING', stem: 'Choose the sentence that best completes the paragraph. "Many students study late at night before an exam. ___ . As a result, they often perform worse than those who sleep adequately."', choices: ['They believe that staying awake longer will help them remember more', 'Sleep is important for everyone', 'Exams are stressful for many students', 'Some students prefer morning classes'], answer: '0', explain: 'The sentence explains the students\' belief that staying awake longer helps, which logically leads to the result that they perform worse.' },
  { id: 'q25', subtest: 'BIND', stem: 'Perhatikan kalimat berikut: "Meskipun telah diperingatkan berkali-kali, tetapi ia tetap melanggar aturan." Perbaikan yang paling tepat adalah...', choices: ['menghapus kata "tetapi"', 'menghapus kata "meskipun"', 'mengganti "tetapi" dengan "namun"', 'mengganti "meskipun" dengan "walaupun"'], answer: '0', explain: 'Konjungsi "meskipun" dan "tetapi" tidak dipakai bersamaan karena sama-sama menandai pertentangan. Cukup gunakan salah satunya; pada kalimat ini, menghapus "tetapi" membuat kalimat efektif.' },
  { id: 'q26', subtest: 'BING', stem: 'Choose the sentence with the correct parallel structure.', choices: ['The program aims to improve access, to reduce costs, and increasing quality.', 'The program aims to improve access, reduce costs, and increase quality.', 'The program aims improving access, reducing costs, and to increase quality.', 'The program aims to improve access, reducing costs, and increase quality.'], answer: '1', explain: 'The items after "aims to" should be parallel base verbs: improve, reduce, and increase.' },
]

const TRYOUTS = [
  { id: 'utbk-1', title: 'Simulasi UTBK 1', type: 'utbk', subtest: null, premium: 1, duration: 2400, desc: 'Paket campuran 26 soal bergaya UTBK dengan stimulus bacaan, penalaran, dan hitungan.' },
  { id: 'utbk-2', title: 'Simulasi UTBK 2', type: 'utbk', subtest: null, premium: 1, duration: 2400, desc: 'Paket kedua dengan komposisi soal yang menuntut analisis lebih dalam.' },
  { id: 'utbk-3', title: 'Simulasi UTBK 3 - Intensif', type: 'utbk', subtest: null, premium: 1, duration: 2400, desc: 'Paket intensif untuk menguji ketahanan dan ketelitian di semua subtes.' },
  { id: 'sub-pm', title: 'Kuis Penalaran Matematika', type: 'subtest', subtest: 'PM', premium: 0, duration: 900, desc: 'Latihan statistik, logaritma, geometri, dan peluang.' },
  { id: 'sub-bind', title: 'Kuis Bahasa Indonesia', type: 'subtest', subtest: 'BIND', premium: 0, duration: 900, desc: 'Ide pokok, kalimat efektif, kohesi, dan makna kata.' },
  { id: 'sub-pu', title: 'Kuis Penalaran Umum', type: 'subtest', subtest: 'PU', premium: 1, duration: 900, desc: 'Silogisme, implikasi, deret, dan penalaran kuantitatif.' },
  { id: 'sub-bing', title: 'Kuis Bahasa Inggris', type: 'subtest', subtest: 'BING', premium: 1, duration: 900, desc: 'Inference, grammar, vocabulary in context, dan parallel structure.' },
]

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
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
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
    const qs = questionsForTryout(t)
    for (let i = 0; i < qs.length; i += 1) {
      await pool.query(
        `INSERT INTO tryout_questions (tryout_id, question_id, position)
         VALUES ($1, $2, $3) ON CONFLICT (tryout_id, question_id) DO NOTHING`,
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