import { useState } from 'react'
import './upgrade.css'

const METHODS = ['QRIS', 'GoPay', 'Transfer Bank']

export default function UpgradeModal({ open, onClose, onConfirm }) {
  const [method, setMethod] = useState('QRIS')
  if (!open) return null
  return (
    <div className="upgrade-backdrop" onClick={onClose}>
      <div className="upgrade-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <h3>Upgrade ke Premium</h3>
        <p>Buka semua tryout UTBK, pembahasan lengkap, Tanya AI, leaderboard, dan analisis passing grade.</p>
        <div className="upgrade-price">Rp 19.000 <small>/ bulan</small></div>
        <div className="method-list">
          {METHODS.map(m => (
            <button key={m} type="button" className={`method ${method === m ? 'on' : ''}`} onClick={() => setMethod(m)}>{m}</button>
          ))}
        </div>
        <p className="upgrade-note">Pembayaran ini hanya simulasi untuk demo.</p>
        <div className="modal-actions">
          <button className="btn btn-glass" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" onClick={() => onConfirm(method)}>Bayar Rp 19.000</button>
        </div>
      </div>
    </div>
  )
}
