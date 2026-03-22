import { useState, useEffect } from 'react'
import { LoginPage } from './pages/LoginPage'
import { AdminDashboard } from './pages/AdminDashboard'
import { StudentPortal } from './pages/StudentPortal'
import type { AuthUser } from './types'

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null)

  // Persist session in sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('hbs_sentinel_user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        sessionStorage.removeItem('hbs_sentinel_user')
      }
    }
  }, [])

  const handleLogin = (authUser: AuthUser) => {
    setUser(authUser)
    sessionStorage.setItem('hbs_sentinel_user', JSON.stringify(authUser))
  }

  const handleLogout = () => {
    setUser(null)
    sessionStorage.removeItem('hbs_sentinel_user')
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  if (user.role === 'admin') {
    return <AdminDashboard user={user} onLogout={handleLogout} />
  }

  return <StudentPortal user={user} onLogout={handleLogout} />
}
