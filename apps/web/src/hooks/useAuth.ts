import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, type AuthUser } from '@/lib/auth'

export function useAuth() {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(() => auth.getUser())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const u = await auth.login(email, password)
      setUser(u)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }, [navigate])

  const logout = useCallback(() => {
    auth.logout()
    setUser(null)
    navigate('/auth/login')
  }, [navigate])

  return { user, loading, error, login, logout, isAuthenticated: !!user }
}
