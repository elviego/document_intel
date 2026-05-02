import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { apiClient, errorMessage } from '@/lib/api-client'
import { auth } from '@/lib/auth'
import { useSchoolYears, currentSchoolYearName } from '@/hooks/useSchoolYear'
import { useCategories } from '@/hooks/useCategories'
import { useBankAccounts } from '@/hooks/useBankAccounts'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ImportModal } from './ImportModal'
import type { TransactionDTO, CategoryDTO } from '@fin-tribe/shared-types'

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useTransactions(filters: Record<string, string>) {
  const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)))
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn:  () => apiClient.get<TransactionDTO[]>(`/v1/transactions?${params}`),
  })
}

// ─── Add Transaction Modal ────────────────────────────────────────────────────
function AddTransactionModal({
  open, onClose, schoolYearId, categories, bankAccounts,
}: {
  open: boolean
  onClose: () => void
  schoolYearId: string
  categories: CategoryDTO[]
  bankAccounts: { id: string; name: string }[]
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    categoryId: '',
    bankAccountId: '',
    amount: '',
    description: '',
  })

  const mutation = useMutation({
    mutationFn: () => apiClient.post('/v1/transactions', {
      ...form,
      schoolYearId,
      amount: parseFloat(form.amount),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); onClose() },
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const incomeCategories  = categories.filter(c => c.classification === 'receita')
  const expenseCategories = categories.filter(c => c.classification === 'despesa')

  return (
    <Modal open={open} onClose={onClose} title={t('transactions.addTransaction')}>
      <div className="space-y-3">
        <Input label={t('transactions.date')} type="date" value={form.date} onChange={set('date')} />

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">{t('transactions.type')}</label>
          <select
            value={form.categoryId} onChange={set('categoryId')}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">— {t('transactions.type')} —</option>
            <optgroup label="Receitas">
              {incomeCategories.map(c => <option key={c.id} value={c.id}>{c.namePt}</option>)}
            </optgroup>
            <optgroup label="Despesas">
              {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.namePt}</option>)}
            </optgroup>
          </select>
        </div>

        <Select
          label={t('transactions.account')}
          value={form.bankAccountId} onChange={set('bankAccountId')}
          options={[{ value: '', label: '— Conta —' }, ...bankAccounts.map(b => ({ value: b.id, label: b.name }))]}
        />
        <Input label={t('transactions.amount')} type="number" step="0.01" placeholder="ex: -400 ou 1200"
          value={form.amount} onChange={set('amount')} />
        <Input label={t('transactions.description')} value={form.description} onChange={set('description')} />

        {!schoolYearId && (
          <p className="text-sm text-amber-600">No school year found. Create one first in School Years settings.</p>
        )}
        {mutation.isError && (
          <p className="text-sm text-red-600">{errorMessage(mutation.error)}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !form.categoryId || !form.bankAccountId || !form.amount || !schoolYearId}
        >
          {mutation.isPending ? t('common.loading') : t('common.save')}
        </Button>
      </div>
    </Modal>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  const { t, i18n } = useTranslation()
  const user = auth.getUser()
  const isAdmin = user?.role === 'admin'

  const { data: years = [] }        = useSchoolYears()
  const { data: categories = [] }   = useCategories()
  const { data: bankAccounts = [] } = useBankAccounts()

  const currentYearName = currentSchoolYearName()
  const currentYear = years.find(y => y.name === currentYearName) ?? years[0]

  const [filters, setFilters] = useState({
    schoolYearId: '',
    monthLabel: '',
    search: '',
  })
  const [showAdd, setShowAdd]       = useState(false)
  const [showImport, setShowImport] = useState(false)

  const schoolYearId = filters.schoolYearId || currentYear?.id || ''
  const { data: transactions = [], isLoading } = useTransactions({ ...filters, schoolYearId })

  const qc = useQueryClient()
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/v1/transactions/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })

  const setFilter = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFilters(f => ({ ...f, [k]: e.target.value }))

  // Derive unique month labels from loaded transactions
  const monthLabels = [...new Set(transactions.map(t => t.monthLabel))].sort().reverse()

  function handleExport() {
    const params = new URLSearchParams({ schoolYearId })
    if (filters.monthLabel) params.set('monthLabel', filters.monthLabel)
    window.open(`/api/v1/transactions/export?${params}`, '_blank')
  }

  const totalIncome  = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0)
  const balance      = totalIncome + totalExpense

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title={t('transactions.title')}
        subtitle={`${transactions.length} movimentos`}
        actions={
          <>
            {isAdmin && (
              <Button variant="secondary" size="sm" onClick={handleExport}>
                ↓ {t('common.export')}
              </Button>
            )}
            {isAdmin && (
              <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
                ↑ Import Excel
              </Button>
            )}
            {(isAdmin || user?.role === 'staff') && (
              <Button size="sm" onClick={() => setShowAdd(true)}>
                + {t('transactions.addTransaction')}
              </Button>
            )}
          </>
        }
      />

      {/* Filters */}
      <div className="px-8 pb-4 flex flex-wrap gap-3">
        <select
          value={filters.schoolYearId} onChange={setFilter('schoolYearId')}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
        </select>

        <select
          value={filters.monthLabel} onChange={setFilter('monthLabel')}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">Todos os meses</option>
          {monthLabels.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <input
          value={filters.search} onChange={setFilter('search')} placeholder={t('common.search')}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {/* Summary bar */}
      <div className="px-8 pb-4 flex gap-6">
        <Stat label={t('common.income')}  value={totalIncome}  color="text-green-700" />
        <Stat label={t('common.expense')} value={totalExpense} color="text-red-700" />
        <Stat label={t('common.balance')} value={balance}      color={balance >= 0 ? 'text-green-700' : 'text-red-700'} />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-8">
        {isLoading ? (
          <p className="text-sm text-gray-400 py-4">{t('common.loading')}</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
                <th className="pb-2 pr-4 font-medium">{t('transactions.date')}</th>
                <th className="pb-2 pr-4 font-medium">{t('transactions.month')}</th>
                <th className="pb-2 pr-4 font-medium">{t('transactions.type')}</th>
                <th className="pb-2 pr-4 font-medium">{t('transactions.description')}</th>
                <th className="pb-2 pr-4 font-medium text-right">{t('transactions.amount')}</th>
                <th className="pb-2 pr-4 font-medium">{t('transactions.account')}</th>
                {isAdmin && <th className="pb-2 font-medium" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50 group">
                  <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">{tx.date.slice(0, 10)}</td>
                  <td className="py-2 pr-4">
                    <Badge variant="gray">{tx.monthLabel}</Badge>
                  </td>
                  <td className="py-2 pr-4 font-medium text-gray-900">
                    {i18n.language === 'pt' ? tx.categoryName : tx.categoryName}
                  </td>
                  <td className="py-2 pr-4 text-gray-600 max-w-xs truncate">{tx.description}</td>
                  <td className={`py-2 pr-4 text-right font-mono font-semibold ${tx.amount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatEuro(tx.amount)}
                  </td>
                  <td className="py-2 pr-4 text-gray-500">{tx.bankAccountName}</td>
                  {isAdmin && (
                    <td className="py-2">
                      <button
                        onClick={() => { if (confirm('Eliminar este movimento?')) deleteMutation.mutate(tx.id) }}
                        className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <AddTransactionModal
          open={showAdd} onClose={() => setShowAdd(false)}
          schoolYearId={schoolYearId}
          categories={categories}
          bankAccounts={bankAccounts}
        />
      )}

      {showImport && (
        <ImportModal
          open={showImport} onClose={() => setShowImport(false)}
          schoolYearId={schoolYearId}
        />
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-base font-semibold ${color}`}>{formatEuro(value)}</p>
    </div>
  )
}

function formatEuro(n: number) {
  return n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
}
