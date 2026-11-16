import api from './client'

export async function getPaymentInfo() {
  const res = await api.get('/payments/price')
  return res.data // { amount, methods, currency, simulated }
}

export async function createPayment(method) {
  const res = await api.post('/payments', { method })
  return res.data // { paymentId, amount, method, status, simulated }
}

export async function confirmPayment(paymentId) {
  const res = await api.post(`/payments/${paymentId}/confirm`)
  return res.data // { ok, isPremium, premiumUntil }
}
