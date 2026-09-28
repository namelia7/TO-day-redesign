import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MOCK_UTBK } from '../data/mockQuestions'
import './pages.css'

export default function CBT(){
  const { id } = useParams()
  const nav = useNavigate()
  const [timeLeft, setTimeLeft] = useState(60 * 30) // 30 min demo
  const [answers, setAnswers] = useState({})

  useEffect(()=>{
    const t = setInterval(()=> setTimeLeft(s => s-1), 1000)
    return ()=> clearInterval(t)
  },[])

  useEffect(()=>{
    if(timeLeft <= 0) nav('/results')
  },[timeLeft])

  const submit = ()=>{
    nav('/results')
  }

  return (
    <div className="page cbt glass">
      <div className="cbt-header">
        <h2>Tryout {id}</h2>
        <div className="timer">Sisa waktu: {Math.floor(timeLeft/60)}:{('0'+timeLeft%60).slice(-2)}</div>
      </div>
      <div className="questions">
        {MOCK_UTBK.map((q, idx) => (
          <div key={q.id} className="question">
            <label>{idx+1}. {q.stem}</label>
            {q.choices ? (
              q.choices.map((c,i)=> (
                <div key={i}><label><input type="radio" name={q.id} onChange={()=> setAnswers(a=> ({...a,[q.id]: i}))} /> {c}</label></div>
              ))
            ) : (
              <input value={answers[q.id]||''} onChange={e=> setAnswers(a=> ({...a,[q.id]: e.target.value}))} />
            )}
            <button className="btn" onClick={()=> alert('Lapor soal dikirim (demo)')}>Laporkan Soal</button>
          </div>
        ))}
      </div>
      <div className="cbt-actions">
        <button className="btn btn-primary" onClick={submit}>Selesai</button>
      </div>
    </div>
  )
}
