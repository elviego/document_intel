import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiClient, errorMessage } from '@/lib/api-client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import type { Role } from '@fin-tribe/shared-types'

interface UserDTO {
  id: string
  email: string
  fullName: string
  role: Role
  isActive: boolean
  createdAt: string
}

function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn:  () => apiClient.get<UserDTO[]>('/v1/users'),
  })
}

const ROLE_OPTIONS = [
  { value: 'admin',      label: 'Admin' },
  { value: 'staff',      label: 'Staff' },
  { value: 'accountant', label: 'Contabilista' },
]

const ROLE_VARIANT: Record<Role, 'red' | 'blue' | 'gray'> = {
  admin:      'red',
  staff:      'blue',
  accountant: 'gray',
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────
function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState({ email: '', fullName: '', role: 'staff' as Role })

  const mutation = useMutation({
    mutationFn: () => apiClient.post('/v1/auth/invite', form),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['users'] }); onClose() },
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <Modal open={open} onClose={onClose} title={t('users.invite')}>
      <div className="space-y-3">
        <Input label={t('users.fullName')} value={form.fullName} onChange={set('fullName')} />
        <Input label={t('users.email')}    type="email" value={form.email} onChange={set('email')} />
        <Select label={t('users.role')} value={form.role} onChange={set('role')} options={ROLE_OPTIONS} />
        {mutation.isError && <p className="text-sm text-red-600">{errorMessage(mutation.error)}</p>}
        {mutation.isSuccess && (
          <p className="text-sm text-green-600">✓ {t('users.inviteSent')}</p>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !form.email || !form.fullName}
        >
          {mutation.isPending ? t('common.loading') : t('users.sendInvite')}
        </Button>
      </div>
    </Modal>
  )
}

// ─── Edit Role Modal ──────────────────────────────────────────────────────────
function EditUserModal({ open, onClose, user }: { open: boolean; onClose: () => void; user: UserDTO }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [role, setRole] = useState<Role>(user.role)

  const mutation = useMutation({
    mutationFn: () => apiClient.patch(`/v1/users/${user.id}`, { role }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['users'] }); onClose() },
  })

  return (
    <Modal open={open} onClose={onClose} title={user.fullName}>
      <div className="space-y-3">
        <p className="text-sm text-gray-500">{user.email}</p>
        <Select
          label={t('users.role')}
          value={role}
          onChange={e => setRole(e.target.value as Role)}
          options={ROLE_OPTIONS}
        />
        {mutation.isError && <p className="text-sm text-red-600">{errorMessage(mutation.error)}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? t('common.loading') : t('common.save')}
        </Button>
      </div>
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const { t } = useTranslation()
  const { data: users = [], isLoading } = useUsers()
  const qc = useQueryClient()
  const [showInvite, setShowInvite] = useState(false)
  const [editing, setEditing] = useState<UserDTO | null>(null)

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(`/v1/users/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  if (isLoading) return <div className="p-8 text-gray-400 text-sm">{t('common.loading')}</div>

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title={t('nav.users')}
        subtitle={`${users.filter(u => u.isActive).length} ativos`}
        actions={
          <Button size="sm" onClick={() => setShowInvite(true)}>
            + {t('users.invite')}
          </Button>
        }
      />

      <div className="flex-1 overflow-auto px-8 pb-8">
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-sm">
          {users.map(user => (
            <div key={user.id} className={`flex items-center gap-4 px-4 py-4 ${!user.isActive ? 'opacity-50' : ''}`}>
              <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
                {user.fullName.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{user.fullName}</p>
                <p className="text-xs text-gray-400">{user.email}</p>
              </div>
              <Badge variant={ROLE_VARIANT[user.role]}>{user.role}</Badge>
              <button
                onClick={() => toggleActive.mutate({ id: user.id, isActive: !user.isActive })}
                className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                  user.isActive ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  user.isActive ? 'translate-x-4' : ''
                }`} />
              </button>
              <button onClick={() => setEditing(user)} className="text-xs text-gray-400 hover:text-gray-700">✎</button>
            </div>
          ))}
          {users.length === 0 && (
            <p className="px-4 py-8 text-sm text-gray-400 text-center">{t('users.empty')}</p>
          )}
        </div>
      </div>

      {showInvite && <InviteModal open onClose={() => setShowInvite(false)} />}
      {editing    && <EditUserModal open onClose={() => setEditing(null)} user={editing} />}
    </div>
  )
}
