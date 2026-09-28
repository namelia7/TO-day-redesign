import './pages.css'

export default function Results(){
  return (
    <div className="page results glass">
      <h2>Hasil & Pembahasan</h2>
      <p>Hasil demo: Skor simulasi, ringkasan jawaban, dan pembahasan singkat.</p>

      <section className="leaderboard glass">
        <h3>Leaderboard</h3>
        <ol>
          <li>Siswa A — 95</li>
          <li>Siswa B — 89</li>
          <li>Anda — 75</li>
        </ol>
      </section>

      <section className="ai-chat glass">
        <h3>Tanya AI (demo)</h3>
        <p>Chatbot demo: masukkan pertanyaan, akan dijawab secara statis.</p>
        <textarea placeholder="Tanyakan soal atau pembahasan..."></textarea>
        <button className="btn" onClick={() => alert('Jawaban AI (demo): coba periksa kembali langkah perhitungan')}>Kirim</button>
      </section>
    </div>
  )
}
