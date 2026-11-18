import axios from 'axios'

// URL backend. Saat development default ke server lokal (lihat server/README).
// Saat deploy, set VITE_API_URL di file .env frontend.
const configuredApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
export const API_URL = configuredApiUrl.replace(/\/+$/, '')

export const api = axios.create({ baseURL: API_URL })

const TOKEN_KEY = 'tod_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Mengubah error axios jadi pesan yang gampang ditampilkan di UI.
export function apiErrorMessage(err, fallback = 'Terjadi kesalahan. Coba lagi.') {
  return err?.response?.data?.error || err?.message || fallback
}

export default api
