import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiClient } from '@/lib/api-client'

export default function AcceptInvitePage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [done, setDone]         = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true); setError(null)
    try {
      await apiClient.post('/v1/auth/accept-invite', { token, password, fullName })
      setDone(true)
      setTimeout(() => navigate('/auth/login'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!token) return <p className="text-red-600 text-sm">Invalid invite link.</p>

  if (done) return (
    <div className="text-center space-y-2">
      <p className="text-brand-700 font-semibold text-lg">✓ Account activated!</p>
      <p className="text-gray-500 text-sm">Redirecting to login…</p>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Set up your account</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
        <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
        {loading ? t('common.loading') : 'Activate account'}
      </button>
    </form>
  )
}
