import { apiClient } from './api-client'

const TOKEN_KEY = 'access_token'
const USER_KEY  = 'auth_user'

export interface AuthUser {
  id: string
  email: string
  fullName: string
  role: 'admin' | 'staff' | 'accountant'
}

export const auth = {
  async login(email: string, password: string): Promise<AuthUser> {
    const res = await apiClient.post<{ token: string; user: AuthUser }>('/v1/auth/login', { email, password })
    localStorage.setItem(TOKEN_KEY, res.token)
    localStorage.setItem(USER_KEY, JSON.stringify(res.user))
    return res.user
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  },

  getUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  },

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getUser()
  },
}
