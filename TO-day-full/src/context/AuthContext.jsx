import { createContext, useState, useEffect, useCallback } from 'react'
import api, { getToken, setToken, apiErrorMessage } from '../api/client'

const AuthContext = createContext()
export default AuthContext

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // true selama kita cek token tersimpan ke server

  // Saat aplikasi dibuka, jika ada token tersimpan, verifikasi ke server
  // dan ambil data user terbaru (bukan sekadar percaya data lama di localStorage).
  // Memakai async function di dalam effect (bukan setState langsung di body
  // effect) supaya setiap pembaruan state terjadi setelah microtask, tidak sinkron.
  useEffect(() => {
    let active = true
    async function verify() {
      const token = getToken()
      if (token) {
        try {
          const res = await api.get('/auth/me')
          if (active) setUser(res.data.user)
        } catch {
          if (active) setToken(null)
        }
      }
      if (active) setLoading(false)
    }
    verify()
    return () => { active = false }
  }, [])

  const login = async (values) => {
    try {
      const res = await api.post('/auth/login', values)
      setToken(res.data.token)
      setUser(res.data.user)
      return res.data.user
    } catch (err) {
      throw new Error(apiErrorMessage(err, 'Email atau password salah.'), { cause: err })
    }
  }

  const register = async (values) => {
    try {
      const res = await api.post('/auth/register', values)
      setToken(res.data.token)
      setUser(res.data.user)
      return res.data.user
    } catch (err) {
      throw new Error(apiErrorMessage(err, 'Gagal mendaftar. Coba lagi.'), { cause: err })
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
  }

  // Perbarui profil (sekolah, PTN, prodi, passing grade) di server.
  const updateUser = async (patch) => {
    const res = await api.patch('/auth/me', patch)
    setUser(res.data.user)
    return res.data.user
  }

  // Dipakai setelah pembayaran (simulasi) dikonfirmasi, supaya state user
  // di frontend langsung sinkron tanpa perlu reload.
  const refreshUser = useCallback(async () => {
    const res = await api.get('/auth/me')
    setUser(res.data.user)
    return res.data.user
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}
