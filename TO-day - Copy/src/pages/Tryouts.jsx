import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'
import UpgradeModal from '../components/UpgradeModal'
import './pages.css'

const MOCK_TRYOUTS = [
  { id: 'utbk-1', title: 'UTBK Simulasi 1', type: 'utbk', premium: true, duration: 1800 },
  { id: 'sub-1', title: 'Kuis Matematika (Aljabar)', type: 'subtest', premium: false, duration: 600 },
  { id: 'sub-2', title: 'Kuis Bahasa Indonesia', type: 'subtest', premium: false, duration: 600 },
]

export default function Tryouts(){
  const { user } = useAuth()
  const [openUpgrade, setOpenUpgrade] = useState(false)

  return (
    <div className="page tryouts glass">
      <h2>Daftar Tryout</h2>
      <p>Beberapa tryout gratis, beberapa premium. Klik "Mulai" untuk memulai simulasi.</p>
      <div className="tryout-list">
        {MOCK_TRYOUTS.map(t => (
          <div key={t.id} className={`tryout-card ${t.premium? 'premium':''}`}>
            <h3>{t.title}</h3>
            <p>Type: {t.type} · Durasi: {Math.floor(t.duration/60)} menit</p>
            {t.premium && !user?.isPremium ? (
              <div>
                <div className="badge">Premium</div>
                <button className="btn btn-primary" onClick={()=> setOpenUpgrade(true)}>Upgrade</button>
              </div>
            ) : (
              <Link to={`/tryouts/${t.id}`} className="btn">Mulai</Link>
            )}
          </div>
        ))}
      </div>
      <UpgradeModal open={openUpgrade} onClose={()=> setOpenUpgrade(false)} onConfirm={()=> { alert('Pembayaran demo berhasil — status premium aktif'); setOpenUpgrade(false); }} />
    </div>
  )
}
