// Memuat Snap.js secara dinamis. Production dan sandbox memakai URL berbeda,
// jadi cukup atur VITE_MIDTRANS_IS_PRODUCTION tanpa mengubah index.html.
let loadingPromise = null

export function loadSnap() {
  const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY
  if (!clientKey) return Promise.resolve(false)
  if (window.snap) return Promise.resolve(true)
  if (loadingPromise) return loadingPromise

  const isProduction = import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === 'true'
  const src = isProduction
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js'

  loadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.dataset.clientKey = clientKey
    script.onload = () => resolve(true)
    script.onerror = () => {
      loadingPromise = null
      reject(new Error('Gagal memuat Midtrans Snap.'))
    }
    document.body.appendChild(script)
  })

  return loadingPromise
}
