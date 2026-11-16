import './App.css'
import { Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Tryouts from './pages/Tryouts'
import CBT from './pages/CBT'
import Results from './pages/Results'
import Stats from './pages/Stats'
import { useAuth } from './context/useAuth'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="app-loading">Memuat...</div>
  return user ? children : <Navigate to="/login" />
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="app-loading">Memuat...</div>
  return user ? <Navigate to="/profile" /> : children
}

function App() {
  return (
    <div className="app-root">
      <Header />

      <main className="site-main">
        <Routes>
          <Route path="/" element={<PublicOnly><Landing /></PublicOnly>} />
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/tryouts" element={<PrivateRoute><Tryouts /></PrivateRoute>} />
          <Route path="/tryouts/:id" element={<PrivateRoute><CBT /></PrivateRoute>} />
          <Route path="/results" element={<PrivateRoute><Results /></PrivateRoute>} />
          <Route path="/stats" element={<PrivateRoute><Stats /></PrivateRoute>} />
        </Routes>
      </main>

      <footer className="site-footer">
        <div>© {new Date().getFullYear()} TO-Day.</div>
      </footer>
    </div>
  )
}

export default App
