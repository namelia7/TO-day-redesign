import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import UpgradeModal from '../components/UpgradeModal'
import { SUBTESTS, getAttempt, listAttempts, getLeaderboard } from '../api/tryouts'
import './pages.css'

// Balasan "Tanya AI" di sini memakai pembahasan yang SUDAH dikirim server
// untuk attempt ini -- bukan memanggil model AI sungguhan. Lihat README
// proyek untuk catatan cara menyambungkan ke Claude API jika diinginkan.
function aiReply(text, breakdown) {
  const n = parseInt((text.match(/\d+/) || [])[0], 10)
  if (n && breakdown[n - 1]) {
    const q = breakdown[n - 1]
    if (q.locked) return `Pembahasan soal ${n} khusus akun Premium. Upgrade untuk membukanya.`
    return `Soal ${n}: ${q.explain}`
  }
  if (/salah|keliru/i.test(text)) {
    const wrong = breakdown.map((q, i) => (q.correct ? null : i + 1)).filter(Boolean)
    return wrong.length ? `Jawabanmu yang belum tepat ada di soal nomor ${wrong.join(', ')}. Tulis nomornya, misalnya "jelaskan soal ${wrong[0]}", dan aku bahas langkahnya.` : 'Semua jawabanmu benar. Kerja bagus!'
  }
  return 'Tulis nomor soal yang membuatmu bingung, misalnya "jelaskan soal 2", atau tanya "kenapa jawabanku salah?".'
}

export default function Results() {
  const { user, refreshUser } = useAuth()
  const location = useLocation()
  const [modal, setModal] = useState(false)
  const [msgs, setMsgs] = useState([{ from: 'ai', text: 'Halo! Ada pembahasan yang masih membingungkan? Tanyakan di sini.' }])
  const [input, setInput] = useState('')

  const [data, setData] = useState(null) // { attempt, isPremium, freeExplainCount, breakdown }
  const [board, setBoard] = useState(null) // { board, myRank, total, isPremium }
  const [state, setState] = useState('loading') // 'loading' | 'ready' | 'empty' | 'error'

  useEffect(() => {
    let active = true
    async function load() {
      try {
        let attemptId = location.state?.attemptId
        if (!attemptId) {
          const attempts = await listAttempts()
          if (!attempts.length) { if (active) setState('empty'); return }
          attemptId = attempts[0].id // attempts diurutkan terbaru lebih dulu oleh server
        }
        const [attemptData, boardData] = await Promise.all([getAttempt(attemptId), getLeaderboard()])
        if (!active) return
        setData(attemptData)
        setBoard(boardData)
        setState('ready')
      } catch {
        if (active) setState('error')
      }
    }
    load()
    return () => { active = false }
  }, [location.state])

  if (state === 'loading') return <div className="page-wrap"><p className="hint">Memuat hasil...</p></div>
  if (state === 'empty') return <Navigate to="/tryouts" replace />
  if (state === 'error') return <div className="page-wrap"><div className="error" role="alert">Gagal memuat hasil tryout.</div></div>

  const { attempt, isPremium: pro, breakdown } = data
  const target = Number(user.passing) || 0

  const send = (text) => {
    const t = text.trim()
    if (!t) return
    setMsgs(m => [...m, { from: 'me', text: t }])
    setInput('')
    setTimeout(() => setMsgs(m => [...m, { from: 'ai', text: aiReply(t, breakdown) }]), 500)
  }

  const onPaid = async () => {
    await refreshUser()
    try {
      const [attemptData, boardData] = await Promise.all([getAttempt(attempt.id), getLeaderboard()])
      setData(attemptData)
      setBoard(boardData)
    } catch { /* tetap tutup modal walau refresh gagal, user bisa reload manual */ }
    setModal(false)
  }

  return (
    <div className="page-wrap">
      <div className="glass-card score-card">
        <div>
          <p className="meta">{attempt.tryoutTitle}</p>
          <h1>Skor {attempt.score}</h1>
          <p>{attempt.correct} dari {attempt.total} soal benar, waktu {Math.floor(attempt.timeUsed / 60)} menit {attempt.timeUsed % 60} detik.</p>
        </div>
        <div className={`goal ${target && attempt.score >= target ? 'goal-ok' : ''}`}>
          {target ? (attempt.score >= target ? `Sudah melewati target ${target}` : `Kurang ${target - attempt.score} poin dari target ${target}`) : 'Isi passing grade di profil untuk melihat target'}
        </div>
      </div>

      <h2 className="sec-title">Pembahasan</h2>
      <div className="stack">
        {breakdown.map((q, i) => {
          if (q.locked) return null
          const mineText = q.given === undefined || q.given === '' ? 'Tidak dijawab' : q.choices ? q.choices[Number(q.given)] : q.given
          const keyText = q.choices ? q.choices[Number(q.answer)] : q.answer
          return (
            <article key={q.id} className="glass-card explain">
              <div className="tc-tags">
                <span className={`badge ${q.correct ? 'badge-free' : 'badge-bad'}`}>{q.correct ? 'Benar' : 'Salah'}</span>
                <span className="meta">Soal {i + 1}, {SUBTESTS[q.subtest]}</span>
              </div>
              <p className="stem">{q.stem}</p>
              <p className="meta">Jawabanmu: {mineText}. Kunci: {keyText}.</p>
              <p>{q.explain}</p>
            </article>
          )
        })}
        {!pro && breakdown.some(q => q.locked) && (
          <div className="glass-card lock-banner">
            <div>
              <h3>{breakdown.filter(q => q.locked).length} pembahasan lainnya terkunci</h3>
              <p>Akun gratis melihat {data.freeExplainCount} pembahasan pertama. Buka semuanya dengan Premium.</p>
            </div>
            <button className="btn btn-primary" onClick={() => setModal(true)}>Buka Premium</button>
          </div>
        )}
      </div>

      <h2 className="sec-title">Tanya AI</h2>
      <section className={`glass-card chat ${pro ? '' : 'chat-locked'}`}>
        <div className="chat-log" aria-live="polite">
          {msgs.map((m, i) => <div key={i} className={`bubble-msg ${m.from}`}>{m.text}</div>)}
        </div>
        <div className="chips">
          {['Jelaskan soal 1', 'Kenapa jawabanku salah?'].map(c => <button key={c} className="chip" disabled={!pro} onClick={() => send(c)}>{c}</button>)}
        </div>
        <form className="chat-form" onSubmit={e => { e.preventDefault(); send(input) }}>
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="Tanyakan soal yang masih bingung" disabled={!pro} aria-label="Pertanyaan untuk AI" />
          <button className="btn btn-primary" disabled={!pro}>Kirim</button>
        </form>
        {!pro && (
          <div className="chat-lock">
            <p>Tanya AI khusus akun Premium.</p>
            <button className="btn btn-primary" onClick={() => setModal(true)}>Buka Premium</button>
          </div>
        )}
      </section>

      <h2 className="sec-title">Leaderboard</h2>
      <section className="glass-card panel">
        <ol className="board">
          {board.board.map(b => (
            <li key={`${b.rank}-${b.name}`} className={b.me ? 'me' : ''}>
              <span className="rank">{b.rank}</span>
              <span className="who">{b.me ? `${b.name} (kamu)` : b.name}</span>
              <strong>{b.score}</strong>
            </li>
          ))}
        </ol>
        {!pro && board.myRank && <p className="hint">Peringkatmu: {board.myRank} dari {board.total}. Premium membuka daftar peringkat lengkap.</p>}
        {board.total === 0 && <p className="hint">Belum ada data leaderboard.</p>}
      </section>

      <div className="form-actions">
        <Link to="/tryouts" className="btn btn-glass">Kerjakan tryout lain</Link>
        <Link to="/stats" className="btn btn-primary">Lihat statistik</Link>
      </div>
      {modal && <UpgradeModal onClose={() => setModal(false)} onPaid={onPaid} />}
    </div>
  )
}
