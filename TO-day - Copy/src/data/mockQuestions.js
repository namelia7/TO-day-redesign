export const SUBTESTS = {
  PU: 'Penalaran Umum',
  PM: 'Penalaran Matematika',
  BIND: 'Bahasa Indonesia',
  BING: 'Bahasa Inggris',
}

// Soal pilihan ganda memakai "choices" dan indeks jawaban. Soal isian singkat tanpa "choices".
export const QUESTIONS = [
  { id: 'q1', subtest: 'PU', stem: 'Semua atlet berlatih setiap hari. Rani berlatih setiap hari. Kesimpulan yang pasti benar adalah...', choices: ['Rani adalah atlet', 'Rani belum tentu atlet', 'Rani bukan atlet', 'Semua yang berlatih adalah atlet'], answer: 1, explain: 'Premis hanya menyatakan bahwa atlet berlatih setiap hari, bukan sebaliknya. Orang yang berlatih setiap hari belum tentu atlet, jadi Rani belum tentu atlet.' },
  { id: 'q2', subtest: 'PU', stem: 'Lanjutkan deret berikut: 2, 6, 18, 54, ... (isi dengan angka)', answer: '162', explain: 'Setiap suku dikali 3. Suku berikutnya adalah 54 x 3 = 162.' },
  { id: 'q3', subtest: 'PM', stem: 'Jika 2x + 3 = 11, maka nilai x adalah...', choices: ['3', '4', '5', '6'], answer: 1, explain: 'Pindahkan 3 ke ruas kanan sehingga 2x = 8, lalu bagi 2 menjadi x = 4.' },
  { id: 'q4', subtest: 'PM', stem: 'Nilai dari 3 pangkat 2 ditambah 4 pangkat 2 adalah... (isi dengan angka)', answer: '25', explain: '3 pangkat 2 sama dengan 9 dan 4 pangkat 2 sama dengan 16. Jumlahnya 25.' },
  { id: 'q5', subtest: 'PM', stem: 'Sebuah dadu dilempar satu kali. Peluang muncul mata dadu genap adalah...', choices: ['1/6', '1/3', '1/2', '2/3'], answer: 2, explain: 'Mata dadu genap ada 3 (2, 4, 6) dari 6 kemungkinan, sehingga peluangnya 3/6 = 1/2.' },
  { id: 'q6', subtest: 'BIND', stem: 'Manakah kalimat yang efektif?', choices: ['Para hadirin-hadirin dimohon berdiri.', 'Hadirin dimohon berdiri.', 'Para hadirin sekalian dimohon untuk berdiri.', 'Dimohon kepada para hadirin-hadirin berdiri.'], answer: 1, explain: 'Kalimat efektif tidak boleh pleonasme. "Para" sudah menyatakan jamak sehingga tidak perlu diulang dengan bentuk ulang atau kata "sekalian".' },
  { id: 'q7', subtest: 'BING', stem: 'She ___ to school every day.', choices: ['go', 'goes', 'going', 'gone'], answer: 1, explain: 'Subjek orang ketiga tunggal (she) pada simple present memakai kata kerja dengan akhiran -s atau -es, jadi "goes".' },
  { id: 'q8', subtest: 'PU', stem: 'Jika hari ini Senin, hari apakah 10 hari lagi? (isi dengan nama hari)', answer: 'kamis', explain: '10 dibagi 7 bersisa 3. Tiga hari setelah Senin adalah Kamis.' },
]

// premium: true berarti hanya untuk akun Premium
export const TRYOUTS = [
  { id: 'utbk-1', title: 'Simulasi UTBK 1', type: 'utbk', premium: true, duration: 1800, desc: 'Semua subtes, format CBT lengkap dengan timer.' },
  { id: 'utbk-2', title: 'Simulasi UTBK 2', type: 'utbk', premium: true, duration: 1800, desc: 'Paket kedua dengan tingkat kesulitan lebih tinggi.' },
  { id: 'sub-pm', title: 'Kuis Penalaran Matematika', type: 'subtest', subtest: 'PM', premium: false, duration: 600, desc: 'Latihan cepat aljabar, peluang, dan hitungan.' },
  { id: 'sub-bind', title: 'Kuis Bahasa Indonesia', type: 'subtest', subtest: 'BIND', premium: false, duration: 600, desc: 'Kalimat efektif, ejaan, dan pemahaman bacaan.' },
  { id: 'sub-pu', title: 'Kuis Penalaran Umum', type: 'subtest', subtest: 'PU', premium: true, duration: 600, desc: 'Silogisme, deret, dan penalaran logis.' },
  { id: 'sub-bing', title: 'Kuis Bahasa Inggris', type: 'subtest', subtest: 'BING', premium: true, duration: 600, desc: 'Grammar dan reading comprehension.' },
]

export const questionsFor = (t) => (t?.subtest ? QUESTIONS.filter(q => q.subtest === t.subtest) : QUESTIONS)

export const isCorrect = (q, a) =>
  q.choices ? a === q.answer : String(a ?? '').trim().toLowerCase() === String(q.answer).toLowerCase()

// Data passing grade demo (bukan data resmi)
export const PASSING = {
  'Institut Teknologi Bandung': { 'Teknik Informatika': 650, 'Teknik Elektro': 640, 'Farmasi': 610 },
  'Universitas Indonesia': { 'Kedokteran': 690, 'Ilmu Komputer': 660, 'Psikologi': 630 },
  'Universitas Gadjah Mada': { 'Kedokteran': 680, 'Teknik Sipil': 620, 'Manajemen': 610 },
  'Institut Pertanian Bogor': { 'Ilmu Komputer': 630, 'Agribisnis': 580, 'Kedokteran Hewan': 620 },
}

export const LEADERBOARD = [
  { name: 'Alya R.', score: 940 }, { name: 'Raka P.', score: 905 }, { name: 'Nadia S.', score: 870 },
  { name: 'Dimas W.', score: 830 }, { name: 'Salsa A.', score: 790 }, { name: 'Fikri H.', score: 740 },
  { name: 'Putri L.', score: 690 }, { name: 'Bagas T.', score: 640 },
]

export const MASTERY = [
  { name: 'Penalaran Umum', value: 58 }, { name: 'Penalaran Matematika', value: 49 },
  { name: 'Bahasa Indonesia', value: 76 }, { name: 'Bahasa Inggris', value: 82 },
]

export const DAILY = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(2026, 8, 16 + i)
  const sessions = [1, 2, 0, 2, 3, 1, 2, 4, 3, 2, 4, 3, 5, 4][i]
  return { date: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }), sessions, avg: sessions ? 520 + i * 9 + sessions * 6 : 0 }
})
