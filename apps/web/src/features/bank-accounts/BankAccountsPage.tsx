import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiClient, errorMessage } from '@/lib/api-client'
import { useBankAccounts } from '@/hooks/useBankAccounts'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import type { BankAccount } from '@fin-tribe/shared-types'

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
function BankAccountModal({
  open, onClose, initial,
}: { open: boolean; onClose: () => void; initial?: BankAccount }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [name, setName] = useState(initial?.name ?? '')

  const mutation = useMutation({
    mutationFn: () => initial
      ? apiClient.patch(`/v1/bank-accounts/${initial.id}`, { name })
      : apiClient.post('/v1/bank-accounts', { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank-accounts'] })
      onClose()
    },
  })

  return (
    <Modal open={open} onClose={onClose} title={initial ? t('bankAccounts.edit') : t('bankAccounts.add')}>
      <div className="space-y-3">
        <Input label={t('bankAccounts.name')} value={name} onChange={e => setName(e.target.value)} />
        {mutation.isError && <p className="text-sm text-red-600">{errorMessage(mutation.error)}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !name.trim()}>
          {mutation.isPending ? t('common.loading') : t('common.save')}
        </Button>
      </div>
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function BankAccountsPage() {
  const { t } = useTranslation()
  const { data: accounts = [], isLoading } = useBankAccounts()
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<BankAccount | null>(null)

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(`/v1/bank-accounts/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank-accounts'] }),
  })

  if (isLoading) return <div className="p-8 text-gray-400 text-sm">{t('common.loading')}</div>

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title={t('nav.bankAccounts')}
        subtitle={`${accounts.length} contas`}
        actions={
          <Button size="sm" onClick={() => setShowAdd(true)}>+ {t('bankAccounts.add')}</Button>
        }
      />

      <div className="flex-1 overflow-auto px-8 pb-8">
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-sm max-w-lg">
          {accounts.map(acc => (
            <div key={acc.id} className={`flex items-center gap-4 px-4 py-4 ${!acc.isActive ? 'opacity-50' : ''}`}>
              {/* Icon */}
              <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center text-brand-700 font-bold text-sm">
                {acc.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{acc.name}</p>
                <p className="text-xs text-gray-400">{acc.isActive ? t('common.active') : t('common.inactive')}</p>
              </div>
              <button
                onClick={() => toggleActive.mutate({ id: acc.id, isActive: !acc.isActive })}
                className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                  acc.isActive ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  acc.isActive ? 'translate-x-4' : ''
                }`} />
              </button>
              <button onClick={() => setEditing(acc)} className="text-xs text-gray-400 hover:text-gray-700">✎</button>
            </div>
          ))}

          {accounts.length === 0 && (
            <p className="px-4 py-8 text-sm text-gray-400 text-center">{t('bankAccounts.empty')}</p>
          )}
        </div>
      </div>

      {showAdd  && <BankAccountModal open onClose={() => setShowAdd(false)} />}
      {editing  && <BankAccountModal open onClose={() => setEditing(null)} initial={editing} />}
    </div>
  )
}
