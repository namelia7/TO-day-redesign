import './upgrade.css'

export default function UpgradeModal({ open, onClose, onConfirm }){
  if(!open) return null
  return (
    <div className="upgrade-backdrop">
      <div className="upgrade-modal glass">
        <h3>Upgrade ke Premium (Demo)</h3>
        <p>Upgrade demo memberi akses ke semua tryout UTBK, pembahasan lengkap, dan leaderboard lebih tinggi.</p>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" onClick={onConfirm}>Beli Rp 19.000 (demo)</button>
        </div>
      </div>
    </div>
  )
}
