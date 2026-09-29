import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { TRYOUTS, SUBTESTS, questionsFor } from '../data/mockQuestions'
import './pages.css'

const REASONS = ['Soal tidak jelas', 'Pilihan jawaban salah', 'Kunci jawaban keliru', 'Gambar atau teks tidak muncul']

export default function CBT() {
  const { id } = useParams()
  const { user, saveResult } = useAuth()
  const nav = useNavigate()
  const tryout = TRYOUTS.find(t => t.id === id)
  const questions = tryout ? questionsFor(tryout) : []

  const [timeLeft, setTimeLeft] = useState(tryout?.duration ?? 0)
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [doubt, setDoubt] = useState({})
  const [confirm, setConfirm] = useState(false)
  const [report, setReport] = useState(null) // null | {reason, sent}
  const answersRef = useRef(answers)
  answersRef.current = answers

  const finish = useCallback(() => {
    saveResult({ tryoutId: tryout.id, answers: answersRef.current, timeUsed: tryout.duration - timeLeftRef.current, date: new Date().toISOString() })
    nav('/results')
  }, [tryout, nav, saveResult])
  const timeLeftRef = useRef(timeLeft)
  timeLeftRef.current = timeLeft

  useEffect(() => {
    if (!tryout) return
    const t = setInterval(() => setTimeLeft(s => s - 1), 1000)
    return () => clearInterval(t)
  }, [tryout])

  useEffect(() => { if (tryout && timeLeft <= 0) finish() }, [timeLeft, tryout, finish])
  useEffect(() => { setReport(null) }, [idx])

  if (!tryout || (tryout.premium && !user.isPremium)) return <Navigate to="/tryouts" replace />

  const q = questions[idx]
  const answered = Object.keys(answers).filter(k => answers[k] !== '' && answers[k] !== undefined).length
  const mm = String(Math.floor(Math.max(timeLeft, 0) / 60)).padStart(2, '0')
  const ss = String(Math.max(timeLeft, 0) % 60).padStart(2, '0')

  return (
    <div className="cbt">
      <div className="cbt-top glass-card">
        <div>
          <strong>{tryout.title}</strong>
          <span className="meta"> {answered} dari {questions.length} terjawab</span>
        </div>
        <div className={`timer ${timeLeft < 60 ? 'timer-low' : ''}`} role="timer">{mm}:{ss}</div>
        <button className="btn btn-primary" onClick={() => setConfirm(true)}>Selesai</button>
      </div>

      <div className="cbt-body">
        <section className="glass-card cbt-question">
          <div className="tc-tags">
            <span className="badge">{SUBTESTS[q.subtest]}</span>
            <span className="meta">Soal {idx + 1} dari {questions.length}</span>
          </div>
          <p className="stem">{q.stem}</p>

          {q.choices ? (
            <div className="options">
              {q.choices.map((c, i) => (
                <button key={i} type="button" className={`option ${answers[q.id] === i ? 'on' : ''}`} onClick={() => setAnswers(a => ({ ...a, [q.id]: i }))}>
                  <span className="opt-key">{String.fromCharCode(65 + i)}</span>{c}
                </button>
              ))}
            </div>
          ) : (
            <div>
              <label htmlFor="short">Jawaban isian singkat</label>
              <input id="short" value={answers[q.id] ?? ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} placeholder="Ketik jawabanmu" />
            </div>
          )}

          <div className="cbt-nav">
            <button className="btn btn-glass" disabled={idx === 0} onClick={() => setIdx(i => i - 1)}>Sebelumnya</button>
            <label className="doubt"><input type="checkbox" checked={!!doubt[q.id]} onChange={e => setDoubt(d => ({ ...d, [q.id]: e.target.checked }))} /> Ragu-ragu</label>
            <button className="btn btn-primary" disabled={idx === questions.length - 1} onClick={() => setIdx(i => i + 1)}>Selanjutnya</button>
          </div>

          <div className="report">
            {!report ? (
              <button className="link-btn" onClick={() => setReport({ reason: REASONS[0], sent: false })}>Laporkan soal ini</button>
            ) : report.sent ? (
              <p className="saved" role="status">Laporan terkirim. Terima kasih sudah membantu.</p>
            ) : (
              <div className="report-box">
                <select value={report.reason} onChange={e => setReport({ ...report, reason: e.target.value })} aria-label="Jenis masalah">
                  {REASONS.map(r => <option key={r}>{r}</option>)}
                </select>
                <button className="btn btn-primary" onClick={() => setReport({ ...report, sent: true })}>Kirim laporan</button>
                <button className="btn btn-ghost" onClick={() => setReport(null)}>Batal</button>
              </div>
            )}
          </div>
        </section>

        <aside className="glass-card cbt-palette">
          <h3>Nomor soal</h3>
          <div className="palette">
            {questions.map((x, i) => {
              const done = answers[x.id] !== undefined && answers[x.id] !== ''
              return (
                <button key={x.id} className={`pal ${i === idx ? 'cur' : ''} ${doubt[x.id] ? 'doubt' : done ? 'done' : ''}`} onClick={() => setIdx(i)} aria-label={`Soal ${i + 1}`}>{i + 1}</button>
              )
            })}
          </div>
          <div className="legend"><span className="lg done" />Terjawab <span className="lg doubt" />Ragu <span className="lg" />Belum</div>
        </aside>
      </div>

      {confirm && (
        <div className="upgrade-backdrop" onClick={() => setConfirm(false)}>
          <div className="upgrade-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <h3>Selesaikan tryout?</h3>
            <p>{answered} dari {questions.length} soal sudah terjawab. Jawaban tidak bisa diubah setelah dikirim.</p>
            <div className="modal-actions">
              <button className="btn btn-glass" onClick={() => setConfirm(false)}>Lanjut mengerjakan</button>
              <button className="btn btn-primary" onClick={finish}>Kirim jawaban</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
