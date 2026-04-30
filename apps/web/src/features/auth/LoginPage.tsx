import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const { t } = useTranslation()
  const { login, loading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await login(email, password)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')}</label>
        <input
          type="email" required value={email} onChange={e => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.password')}</label>
        <input
          type="password" required value={password} onChange={e => setPassword(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit" disabled={loading}
        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
      >
        {loading ? t('common.loading') : t('auth.signIn')}
      </button>
    </form>
  )
}
