import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('tod_auth_user')
      return raw ? JSON.parse(raw) : null
    } catch (e) {
      return null
    }
  })

  useEffect(() => {
    try {
      if (user) localStorage.setItem('tod_auth_user', JSON.stringify(user))
      else localStorage.removeItem('tod_auth_user')
    } catch (e) {}
  }, [user])

  const login = (values) => {
    // demo: accept only demo account credentials
    const demoEmail = 'johndoe@gmail.com'
    const demoPass = 'pass1234'
    if (values.email === demoEmail && values.password === demoPass) {
      const u = {
        id: 1,
        name: 'John Doe',
        email: demoEmail,
        isPremium: true,
        school: 'SMA Negeri 1 Jakarta',
        target: 'ITB - Teknik Informatika',
        passing: '650',
        // demo stats (date, progress)
        stats: [
          { date: '2026-09-20', progress: 2 },
          { date: '2026-09-21', progress: 4 },
          { date: '2026-09-22', progress: 6 },
          { date: '2026-09-23', progress: 7 },
          { date: '2026-09-24', progress: 9 },
        ],
      }
      setUser(u)
      return Promise.resolve(u)
    }

    return Promise.reject(new Error('Invalid credentials (demo). Use johndoe@gmail.com / pass1234'))
  }

  const register = (values) => {
    const u = { id: Date.now(), name: values.name, email: values.email, isPremium: false }
    setUser(u)
    return Promise.resolve(u)
  }

  const logout = () => setUser(null)

  return (
    <AuthContext.Provider value={{ user, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export default AuthContext
