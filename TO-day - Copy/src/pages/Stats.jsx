import './pages.css'

export default function Stats(){
  // demo data (randomized slightly for demo interactivity)
  const base = [2,4,6,7,9]
  const data = base.map((v,i)=> ({ date: `2026-09-${20+i}`, progress: v + (i%2) }))

  const total = data.reduce((s,d)=> s+d.progress, 0)
  const avg = Math.round(total / data.length)

  return (
    <div className="page stats glass">
      <h2>Statistik Interaktif</h2>
      <p>Progress harian (demo)</p>
      <div className="chart glass">
        {data.map(d=> (
          <div key={d.date} className="bar" style={{height: `${d.progress*8}px`}} title={`${d.date}: ${d.progress} latihan`}>
            <span className="label">{d.date.slice(5)}</span>
          </div>
        ))}
      </div>
      <div className="analysis glass">
        <h4>Ringkasan</h4>
        <p>Jumlah sesi: {total} · Rata-rata / hari: {avg}</p>
        <p>Rekomendasi: Tingkatkan frekuensi Matematika jika di bawah passing grade.</p>
      </div>
    </div>
  )
}
