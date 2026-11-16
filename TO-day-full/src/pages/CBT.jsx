import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { SUBTESTS, getTryoutQuestions, submitAttempt, reportQuestion } from '../api/tryouts'
import { apiErrorMessage } from '../api/client'
import './pages.css'

const REASONS = ['Soal tidak jelas', 'Pilihan jawaban salah', 'Kunci jawaban keliru', 'Gambar atau teks tidak muncul']

export default function CBT() {
  const { id } = useParams()
  const nav = useNavigate()

  const [tryout, setTryout] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loadState, setLoadState] = useState('loading') // 'loading' | 'ready' | 'forbidden' | 'error'

  const [timeLeft, setTimeLeft] = useState(0)
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [doubt, setDoubt] = useState({})
  const [confirm, setConfirm] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [report, setReport] = useState(null) // null | {reason, sent}

  // Ref dipakai supaya finish() (dipanggil dari dalam callback interval atau
  // dari handler tombol) selalu membaca jawaban/waktu TERBARU tanpa perlu
  // menjadikannya dependency effect. Ref diperbarui lewat effect, bukan
  // langsung di body komponen saat render.
  const answersRef = useRef(answers)
  const timeLeftRef = useRef(timeLeft)
  useEffect(() => { answersRef.current = answers }, [answers])
  useEffect(() => { timeLeftRef.current = timeLeft }, [timeLeft])

  // Soal diambil dari server TANPA kunci jawaban/pembahasan -- itu baru
  // dikirim server setelah tryout disubmit, supaya tidak bisa dilihat
  // lewat devtools selama mengerjakan.
  useEffect(() => {
    let active = true
    getTryoutQuestions(id)
      .then(({ tryout: t, questions: qs }) => {
        if (!active) return
        setTryout(t)
        setQuestions(qs)
        setTimeLeft(t.duration)
        setLoadState('ready')
      })
      .catch(err => {
        if (!active) return
        if (err?.response?.status === 403) setLoadState('forbidden')
        else setLoadState('error')
      })
    return () => { active = false }
  }, [id])

  const finishingRef = useRef(false)
  const finish = useCallback(() => {
    if (finishingRef.current) return
    finishingRef.current = true
    setFinishing(true)
    const timeUsed = tryout.duration - timeLeftRef.current
    submitAttempt(tryout.id, answersRef.current, timeUsed)
      .then(res => nav('/results', { state: { attemptId: res.attemptId } }))
      .catch(err => {
        finishingRef.current = false
        setFinishing(false)
        alert(apiErrorMessage(err, 'Gagal mengirim jawaban. Coba lagi.'))
      })
  }, [tryout, nav])

  // Timer: hitung mundur tiap detik, dan panggil finish() dari DALAM callback
  // interval saat waktu habis (bukan dari effect terpisah yang mengamati
  // timeLeft), supaya tidak ada setState yang dipanggil sinkron di body effect.
  useEffect(() => {
    if (loadState !== 'ready') return
    const t = setInterval(() => {
      setTimeLeft(s => {
        const next = s - 1
        if (next <= 0) finish()
        return next
      })
    }, 1000)
    return () => clearInterval(t)
  }, [loadState, finish])

  const goTo = (i) => { setIdx(i); setReport(null) }

  if (loadState === 'loading') return <div className="page-wrap"><p className="hint">Memuat soal...</p></div>
  if (loadState === 'forbidden') return <Navigate to="/tryouts" replace />
  if (loadState === 'error') return (
    <div className="page-wrap">
      <div className="error" role="alert">Gagal memuat tryout ini. Tryout mungkin tidak ditemukan.</div>
    </div>
  )

  const q = questions[idx]
  const answered = Object.keys(answers).filter(k => answers[k] !== '' && answers[k] !== undefined).length
  const mm = String(Math.floor(Math.max(timeLeft, 0) / 60)).padStart(2, '0')
  const ss = String(Math.max(timeLeft, 0) % 60).padStart(2, '0')

  const sendReport = async () => {
    try {
      await reportQuestion(tryout.id, q.id, report.reason)
      setReport({ ...report, sent: true })
    } catch {
      setReport({ ...report, sent: true }) // tetap tampilkan terkirim ke pengguna; kegagalan jaringan tidak perlu menghentikan ujian
    }
  }

  return (
    <div className="cbt">
      <div className="cbt-top glass-card">
        <div>
          <strong>{tryout.title}</strong>
          <span className="meta"> {answered} dari {questions.length} terjawab</span>
        </div>
        <div className={`timer ${timeLeft < 60 ? 'timer-low' : ''}`} role="timer">{mm}:{ss}</div>
        <button className="btn btn-primary" onClick={() => setConfirm(true)} disabled={finishing}>Selesai</button>
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
                <button key={i} type="button" className={`option ${answers[q.id] === String(i) ? 'on' : ''}`} onClick={() => setAnswers(a => ({ ...a, [q.id]: String(i) }))}>
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
            <button className="btn btn-glass" disabled={idx === 0} onClick={() => goTo(idx - 1)}>Sebelumnya</button>
            <label className="doubt"><input type="checkbox" checked={!!doubt[q.id]} onChange={e => setDoubt(d => ({ ...d, [q.id]: e.target.checked }))} /> Ragu-ragu</label>
            <button className="btn btn-primary" disabled={idx === questions.length - 1} onClick={() => goTo(idx + 1)}>Selanjutnya</button>
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
                <button className="btn btn-primary" onClick={sendReport}>Kirim laporan</button>
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
                <button key={x.id} className={`pal ${i === idx ? 'cur' : ''} ${doubt[x.id] ? 'doubt' : done ? 'done' : ''}`} onClick={() => goTo(i)} aria-label={`Soal ${i + 1}`}>{i + 1}</button>
              )
            })}
          </div>
          <div className="legend"><span className="lg done" />Terjawab <span className="lg doubt" />Ragu <span className="lg" />Belum</div>
        </aside>
      </div>

      {confirm && (
        <div className="upgrade-backdrop" onClick={() => !finishing && setConfirm(false)}>
          <div className="upgrade-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <h3>Selesaikan tryout?</h3>
            <p>{answered} dari {questions.length} soal sudah terjawab. Jawaban tidak bisa diubah setelah dikirim.</p>
            <div className="modal-actions">
              <button className="btn btn-glass" onClick={() => setConfirm(false)} disabled={finishing}>Lanjut mengerjakan</button>
              <button className="btn btn-primary" onClick={finish} disabled={finishing}>{finishing ? 'Mengirim...' : 'Kirim jawaban'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
