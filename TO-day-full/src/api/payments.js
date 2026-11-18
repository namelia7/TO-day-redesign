import api from './client'

export async function getPaymentInfo() {
  const res = await api.get('/payments/price')
  // { price, currency, midtrans: { enabled }, manual: { enabled, whatsappNumber, holdHours }, pending }
  return res.data
}

// Midtrans Snap (otomatis). Hanya berfungsi jika kredensial Midtrans diisi.
export async function createPayment(method) {
  const res = await api.post('/payments', method ? { method } : {})
  return res.data // { paymentId, orderId, token, redirectUrl }
}

// Pembayaran manual QRIS via WhatsApp (verifikasi admin).
export async function createManualPayment() {
  const res = await api.post('/payments/manual')
  return res.data // { paymentId, orderId, amount, whatsappUrl, expiresAt }
}

export async function getPaymentStatus(paymentId) {
  const res = await api.get(`/payments/${paymentId}/status`)
  return res.data // { paymentId, status, isPremium, premiumUntil }
}

export async function getPaymentHistory() {
  const res = await api.get('/payments/history')
  return res.data // { payments }
}

function adminHeaders(token) {
  return { headers: { 'x-admin-token': token } }
}

export async function getAdminPayments(token, status = 'pending') {
  const res = await api.get('/admin/payments', {
    params: { status },
    ...adminHeaders(token),
  })
  return res.data
}

export async function approvePayment(id, token, note = '') {
  const res = await api.post(`/admin/payments/${id}/approve`, { note }, adminHeaders(token))
  return res.data
}

export async function rejectPayment(id, token, note = '') {
  const res = await api.post(`/admin/payments/${id}/reject`, { note }, adminHeaders(token))
  return res.data
}
