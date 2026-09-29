import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import UpgradeModal from '../components/UpgradeModal'
import { TRYOUTS, SUBTESTS, LEADERBOARD, questionsFor, isCorrect } from '../data/mockQuestions'
import './pages.css'

const FREE_EXPLAIN = 3

function aiReply(text, qs, answers) {
  const n = parseInt((text.match(/\d+/) || [])[0], 10)
  if (n && qs[n - 1]) return `Soal ${n}: ${qs[n - 1].explain}`
  if (/salah|keliru/i.test(text)) {
    const wrong = qs.map((q, i) => (isCorrect(q, answers[q.id]) ? null : i + 1)).filter(Boolean)
    return wrong.length ? `Jawabanmu yang belum tepat ada di soal nomor ${wrong.join(', ')}. Tulis nomornya, misalnya "jelaskan soal ${wrong[0]}", dan aku bahas langkahnya.` : 'Semua jawabanmu benar. Kerja bagus!'
  }
  return 'Tulis nomor soal yang membuatmu bingung, misalnya "jelaskan soal 2", atau tanya "kenapa jawabanku salah?".'
}

export default function Results() {
  const { user, result, upgrade, updateUser } = useAuth()
  const [modal, setModal] = useState(false)
  const [msgs, setMsgs] = useState([{ from: 'ai', text: 'Halo! Ada pembahasan yang masih membingungkan? Tanyakan di sini.' }])
  const [input, setInput] = useState('')

  const tryout = result && TRYOUTS.find(t => t.id === result.tryoutId)
  if (!tryout) return <Navigate to="/tryouts" replace />

  const qs = questionsFor(tryout)
  const answers = result.answers
  const correct = qs.filter(q => isCorrect(q, answers[q.id])).length
  const score = Math.round(200 + (correct / qs.length) * 800)
  const target = Number(user.passing) || 0
  const pro = user.isPremium

  const board = [...LEADERBOARD, { name: `${user.name} (kamu)`, score, me: true }].sort((a, b) => b.score - a.score)
  const myRank = board.findIndex(b => b.me) + 1
  const shownBoard = pro ? board : board.filter((b, i) => i < 3 || b.me)

  const send = (text) => {
    const t = text.trim()
    if (!t) return
    setMsgs(m => [...m, { from: 'me', text: t }])
    setInput('')
    setTimeout(() => setMsgs(m => [...m, { from: 'ai', text: aiReply(t, qs, answers) }]), 500)
  }

  const onPay = (m) => { upgrade(); updateUser({ payMethod: m }); setModal(false) }

  return (
    <div className="page-wrap">
      <div className="glass-card score-card">
        <div>
          <p className="meta">{tryout.title}</p>
          <h1>Skor {score}</h1>
          <p>{correct} dari {qs.length} soal benar, waktu {Math.floor(result.timeUsed / 60)} menit {result.timeUsed % 60} detik.</p>
        </div>
        <div className={`goal ${target && score >= target ? 'goal-ok' : ''}`}>
          {target ? (score >= target ? `Sudah melewati target ${target}` : `Kurang ${target - score} poin dari target ${target}`) : 'Isi passing grade di profil untuk melihat target'}
        </div>
      </div>

      <h2 className="sec-title">Pembahasan</h2>
      <div className="stack">
        {qs.map((q, i) => {
          if (!pro && i >= FREE_EXPLAIN) return null
          const ok = isCorrect(q, answers[q.id])
          const mine = answers[q.id]
          const mineText = mine === undefined || mine === '' ? 'Tidak dijawab' : q.choices ? q.choices[mine] : mine
          const keyText = q.choices ? q.choices[q.answer] : q.answer
          return (
            <article key={q.id} className="glass-card explain">
              <div className="tc-tags">
                <span className={`badge ${ok ? 'badge-free' : 'badge-bad'}`}>{ok ? 'Benar' : 'Salah'}</span>
                <span className="meta">Soal {i + 1}, {SUBTESTS[q.subtest]}</span>
              </div>
              <p className="stem">{q.stem}</p>
              <p className="meta">Jawabanmu: {mineText}. Kunci: {keyText}.</p>
              <p>{q.explain}</p>
            </article>
          )
        })}
        {!pro && qs.length > FREE_EXPLAIN && (
          <div className="glass-card lock-banner">
            <div>
              <h3>{qs.length - FREE_EXPLAIN} pembahasan lainnya terkunci</h3>
              <p>Akun gratis melihat 3 pembahasan pertama. Buka semuanya dengan Premium.</p>
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
          {shownBoard.map(b => (
            <li key={b.name} className={b.me ? 'me' : ''}>
              <span className="rank">{board.indexOf(b) + 1}</span>
              <span className="who">{b.name}</span>
              <strong>{b.score}</strong>
            </li>
          ))}
        </ol>
        {!pro && <p className="hint">Peringkatmu: {myRank} dari {board.length}. Premium membuka daftar peringkat lengkap.</p>}
      </section>

      <div className="form-actions">
        <Link to="/tryouts" className="btn btn-glass">Kerjakan tryout lain</Link>
        <Link to="/stats" className="btn btn-primary">Lihat statistik</Link>
      </div>
      <UpgradeModal open={modal} onClose={() => setModal(false)} onConfirm={onPay} />
    </div>
  )
}
