import { Link } from 'react-router-dom'
import './pages.css'

const FEATURES = [
  { icon: '🖥️', title: 'Simulasi mirip UTBK', text: 'Tampilan CBT dengan timer, nomor soal, dan format isian singkat seperti ujian sungguhan.' },
  { icon: '⚡', title: 'Kuis per subtes', text: 'Latihan pendek 10 menit untuk satu subtes. Cocok saat waktu belajar tidak banyak.' },
  { icon: '📝', title: 'Pembahasan lengkap', text: 'Setiap soal dibahas langkah demi langkah, hanya terbuka setelah tryout selesai dikerjakan.' },
  { icon: '💬', title: 'Tanya AI', text: 'Masih bingung dengan pembahasan? Tanyakan langsung tanpa keluar dari halaman hasil.' },
  { icon: '🏆', title: 'Leaderboard', text: 'Lihat posisi skormu di antara peserta lain dan kejar peringkat teratas.' },
  { icon: '📈', title: 'Statistik progres', text: 'Pantau latihan harian, subtes yang perlu diperkuat, dan jarak skor ke passing grade.' },
]

const FREE = [
  'Kuis per subtes (paket dasar)',
  'Skor dan ringkasan hasil',
  'Pembahasan 3 soal pertama',
  'Statistik progres dasar',
]

const PREMIUM = [
  'Semua tryout simulasi UTBK',
  'Pembahasan lengkap semua soal',
  'Tanya AI tanpa batas',
  'Leaderboard dan peringkat lengkap',
  'Analisis passing grade PTN dan prodi',
]

const TESTI = [
  { name: 'Alya, calon mahasiswa Kedokteran', text: 'Timer dan tampilan soalnya mirip banget sama UTBK, jadi pas hari H nggak kaget lagi.' },
  { name: 'Raka, siswa kelas 12', text: 'Grafik progresnya jelas. Aku jadi tahu harus fokus latihan Penalaran Matematika dulu.' },
  { name: 'Nadia, pejuang Teknik Informatika', text: 'Kalau bingung tinggal tanya AI di bawah pembahasan. Praktis dan harganya masuk uang jajan.' },
]

export default function Landing() {
  return (
    <div className="landing">
      <section className="hero">
        <p className="hero-tag">Persiapan UTBK yang terasa seperti aslinya</p>
        <h1>Latihan hari ini,<br />lolos PTN impianmu.</h1>
        <p className="hero-sub">
          Tryout UTBK berbasis komputer dengan pembahasan, leaderboard, dan statistik yang
          menunjukkan seberapa dekat kamu dengan passing grade.
        </p>
        <div className="cta">
          <Link to="/register" className="btn btn-primary btn-lg">Mulai gratis</Link>
          <a href="#paket" className="btn btn-glass btn-lg">Lihat paket</a>
        </div>

        <div className="hero-card glass-card" aria-hidden="true">
          <div className="hc-top">
            <span>Progres minggu ini</span>
            <strong>Skor rata-rata 612</strong>
          </div>
          <div className="hc-bars">
            {[38, 52, 46, 68, 74, 88].map((h, i) => (
              <span key={i} style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="hc-foot">Target ITB Teknik Informatika: 650</div>
        </div>
      </section>

      <section id="fitur" className="section">
        <h2>Semua yang kamu butuhkan untuk berlatih</h2>
        <p className="section-sub">Dari simulasi ujian sampai analisis hasil, dalam satu tempat.</p>
        <div className="feature-grid">
          {FEATURES.map(f => (
            <article key={f.title} className="glass-card feature">
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="paket" className="section">
        <h2>Pilih paket yang cocok</h2>
        <p className="section-sub">Mulai gratis. Upgrade kapan saja dengan harga yang ramah kantong pelajar.</p>
        <div className="packs">
          <article className="glass-card pack">
            <h3>Gratis</h3>
            <div className="price">Rp 0</div>
            <ul>{FREE.map(i => <li key={i}>{i}</li>)}</ul>
            <Link to="/register" className="btn btn-glass btn-block">Daftar gratis</Link>
          </article>
          <article className="glass-card pack pack-premium">
            <span className="pack-badge">Paling banyak dipilih</span>
            <h3>Premium</h3>
            <div className="price">Rp 19.000 <small>/ bulan</small></div>
            <ul>{PREMIUM.map(i => <li key={i}>{i}</li>)}</ul>
            <Link to="/register" className="btn btn-primary btn-block">Coba Premium</Link>
          </article>
        </div>
      </section>

      <section id="testimoni" className="section">
        <h2>Kata mereka yang sudah berlatih</h2>
        <div className="testi-list">
          {TESTI.map(t => (
            <figure key={t.name} className="glass-card testi">
              <blockquote>{t.text}</blockquote>
              <figcaption>{t.name}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="section final-cta glass-card">
        <h2>Siap coba tryout pertamamu?</h2>
        <p className="section-sub">Buat akun dalam satu menit, tanpa kartu kredit.</p>
        <Link to="/register" className="btn btn-primary btn-lg">Daftar sekarang</Link>
      </section>
    </div>
  )
}
