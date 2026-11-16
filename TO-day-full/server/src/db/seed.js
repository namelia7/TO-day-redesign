// Seed database dengan subtes, soal, tryout, dan akun demo.
// Soal di sini SAMA PERSIS dengan 8 soal yang ada di versi demo React
// (src/data/mockQuestions.js) -- bukan soal UTBK resmi, hanya contoh latihan.
import bcrypt from 'bcryptjs'
import { db } from './index.js'

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
]

const TRYOUTS = [
  { id: 'utbk-1', title: 'Simulasi UTBK 1', type: 'utbk', subtest: null, premium: 1, duration: 1800, desc: 'Semua subtes, format CBT lengkap dengan timer.' },
  { id: 'utbk-2', title: 'Simulasi UTBK 2', type: 'utbk', subtest: null, premium: 1, duration: 1800, desc: 'Paket kedua dengan tingkat kesulitan lebih tinggi.' },
  { id: 'sub-pm', title: 'Kuis Penalaran Matematika', type: 'subtest', subtest: 'PM', premium: 0, duration: 600, desc: 'Latihan cepat aljabar, peluang, dan hitungan.' },
  { id: 'sub-bind', title: 'Kuis Bahasa Indonesia', type: 'subtest', subtest: 'BIND', premium: 0, duration: 600, desc: 'Kalimat efektif, ejaan, dan pemahaman bacaan.' },
  { id: 'sub-pu', title: 'Kuis Penalaran Umum', type: 'subtest', subtest: 'PU', premium: 1, duration: 600, desc: 'Silogisme, deret, dan penalaran logis.' },
  { id: 'sub-bing', title: 'Kuis Bahasa Inggris', type: 'subtest', subtest: 'BING', premium: 1, duration: 600, desc: 'Grammar dan reading comprehension.' },
]

function questionsForTryout(t) {
  if (t.subtest) return QUESTIONS.filter(q => q.subtest === t.subtest)
  return QUESTIONS // tryout tipe 'utbk' memakai semua soal (demo)
}

function run() {
  const insertSubtest = db.prepare('INSERT OR IGNORE INTO subtests (code, name) VALUES (?, ?)')
  const tx1 = db.transaction(() => { for (const [code, name] of SUBTESTS) insertSubtest.run(code, name) })
  tx1()

  const insertQuestion = db.prepare(`
    INSERT OR IGNORE INTO questions (id, subtest_code, stem, choices, answer, explain)
    VALUES (@id, @subtest, @stem, @choices, @answer, @explain)
  `)
  const tx2 = db.transaction(() => {
    for (const q of QUESTIONS) {
      insertQuestion.run({ ...q, choices: q.choices ? JSON.stringify(q.choices) : null })
    }
  })
  tx2()

  const insertTryout = db.prepare(`
    INSERT OR IGNORE INTO tryouts (id, title, type, subtest_code, is_premium, duration_seconds, description)
    VALUES (@id, @title, @type, @subtest, @premium, @duration, @desc)
  `)
  const insertTQ = db.prepare(`
    INSERT OR IGNORE INTO tryout_questions (tryout_id, question_id, position) VALUES (?, ?, ?)
  `)
  const tx3 = db.transaction(() => {
    for (const t of TRYOUTS) {
      insertTryout.run(t)
      const qs = questionsForTryout(t)
      qs.forEach((q, i) => insertTQ.run(t.id, q.id, i))
    }
  })
  tx3()

  // Akun demo, sama seperti versi demo: johndoe@gmail.com / pass1234
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('johndoe@gmail.com')
  if (!existing) {
    const hash = bcrypt.hashSync('pass1234', 10)
    db.prepare(`
      INSERT INTO users (name, email, password_hash, is_premium, school, ptn, prodi, passing_grade)
      VALUES (?, ?, ?, 1, ?, ?, ?, ?)
    `).run('John Doe', 'johndoe@gmail.com', hash, 'SMA Negeri 1 Jakarta', 'Institut Teknologi Bandung', 'Teknik Informatika', 650)
    console.log('Akun demo dibuat: johndoe@gmail.com / pass1234')
  } else {
    console.log('Akun demo sudah ada, dilewati.')
  }

  console.log('Seed selesai.')
}

run()
