import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiClient } from '@/lib/api-client'
import { useSchoolYears, currentSchoolYearName } from '@/hooks/useSchoolYear'
import { useCategories } from '@/hooks/useCategories'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { auth } from '@/lib/auth'
import clsx from 'clsx'

const SCHOOL_MONTHS = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8]
const MONTH_LABELS  = ['Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago']

interface BudgetEntry { id: string; categoryId: string; month: number; plannedAmount: number }

function useBudget(schoolYearId: string) {
  return useQuery({
    queryKey: ['budget', schoolYearId],
    queryFn:  () => apiClient.get<BudgetEntry[]>(`/v1/budget/${schoolYearId}`),
    enabled:  !!schoolYearId,
  })
}

function fmtCurrency(n: number) {
  if (n === 0) return '—'
  return n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

function fmt0(n: number) {
  return n === 0 ? '' : n.toLocaleString('pt-PT', { maximumFractionDigits: 0 })
}

// ─── Editable cell ────────────────────────────────────────────────────────────
function EditableCell({ value, onCommit }: { value: number; onCommit: (raw: string) => void }) {
  const [raw, setRaw] = useState(value === 0 ? '' : String(value))
  const ref = useRef<HTMLInputElement>(null)
  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      value={raw}
      onChange={e => setRaw(e.target.value)}
      onFocus={() => ref.current?.select()}
      onBlur={() => onCommit(raw)}
      placeholder="—"
      className="w-full text-right text-xs tabular-nums px-1 py-0.5 rounded border border-transparent
                 hover:border-gray-300 focus:border-brand-500 focus:outline-none bg-transparent focus:bg-white"
    />
  )
}

// ─── Section header row ────────────────────────────────────────────────────────
function SectionHeader({ label, color, colCount }: { label: string; color: string; colCount: number }) {
  return (
    <tr>
      <td colSpan={colCount} className={clsx('py-1.5 px-2 text-xs font-bold uppercase tracking-wider', color)}>
        {label}
      </td>
    </tr>
  )
}

// ─── Category data row ────────────────────────────────────────────────────────
function CategoryRow({ catId, catName, isAdmin, months, getAmount, onCommit, colorClass }: {
  catId: string; catName: string; isAdmin: boolean; months: number[]
  getAmount: (catId: string, m: number) => number
  onCommit: (catId: string, m: number, raw: string) => void
  colorClass: string
}) {
  const yearTotal = months.reduce((s, m) => s + getAmount(catId, m), 0)
  return (
    <tr className="hover:bg-gray-50 border-b border-gray-100">
      <td className="py-1 pr-3 text-gray-700 font-medium truncate max-w-[11rem]">{catName}</td>
      {months.map(m => (
        <td key={m} className="py-1 px-1">
          {isAdmin ? (
            <EditableCell value={getAmount(catId, m)} onCommit={raw => onCommit(catId, m, raw)} />
          ) : (
            <span className="block text-right tabular-nums text-gray-600 px-1 text-xs">
              {fmt0(getAmount(catId, m))}
            </span>
          )}
        </td>
      ))}
      <td className={clsx('py-1 pl-2 text-right font-semibold tabular-nums text-xs', colorClass)}>
        {fmt0(yearTotal)}
      </td>
    </tr>
  )
}

// ─── Total row ────────────────────────────────────────────────────────────────
function TotalRow({ label, months, getValue, className, colorize }: {
  label: string; months: number[]; getValue: (m: number) => number; className?: string; colorize?: boolean
}) {
  const yearTotal = months.reduce((s, m) => s + getValue(m), 0)
  return (
    <tr className={clsx('border-t border-gray-300', className)}>
      <td className="py-2 pr-3 text-xs">{label}</td>
      {months.map(m => {
        const v = getValue(m)
        return (
          <td key={m} className={clsx('py-2 px-1.5 text-right tabular-nums text-xs',
            colorize && v !== 0 && (v > 0 ? 'text-green-700' : 'text-red-700'))}>
            {fmtCurrency(v)}
          </td>
        )
      })}
      <td className={clsx('py-2 pl-2 text-right tabular-nums text-xs',
        colorize && yearTotal !== 0 && (yearTotal > 0 ? 'text-green-700' : 'text-red-700'))}>
        {fmtCurrency(yearTotal)}
      </td>
    </tr>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function BudgetPage() {
  const { t } = useTranslation()
  const user    = auth.getUser()
  const isAdmin = user?.role === 'admin'

  const { data: years = [] }      = useSchoolYears()
  const { data: categories = [] } = useCategories()
  const currentYearName = currentSchoolYearName()
  const currentYear     = years.find(y => y.name === currentYearName) ?? years[0]
  const [selectedYearId, setSelectedYearId] = useState('')
  const yearId = selectedYearId || currentYear?.id || ''

  const { data: budget = [], isLoading } = useBudget(yearId)
  const qc = useQueryClient()

  // Local edits overlay on top of server data
  const [edits, setEdits] = useState<Record<string, number>>({})
  const bkey = (catId: string, month: number) => `${catId}|${month}`

  const budgetMap = useMemo(() => {
    const m: Record<string, number> = {}
    budget.forEach(b => { m[bkey(b.categoryId, b.month)] = b.plannedAmount })
    return m
  }, [budget])

  function getAmount(catId: string, month: number) {
    const k = bkey(catId, month)
    return k in edits ? edits[k] : (budgetMap[k] ?? 0)
  }

  const upsertMutation = useMutation({
    mutationFn: ({ categoryId, month, amount }: { categoryId: string; month: number; amount: number }) =>
      apiClient.put('/v1/budget', { schoolYearId: yearId, categoryId, month, plannedAmount: amount }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget', yearId] }),
  })

  const copyMutation = useMutation({
    mutationFn: (fromYearId: string) =>
      apiClient.post('/v1/budget/copy', { fromYearId, toYearId: yearId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget', yearId] })
      setEdits({})
    },
  })

  function handleCommit(catId: string, month: number, raw: string) {
    if (!isAdmin) return
    const val = parseFloat(raw.replace(',', '.')) || 0
    setEdits(prev => ({ ...prev, [bkey(catId, month)]: val }))
    upsertMutation.mutate({ categoryId: catId, month, amount: val })
  }

  const expenseCategories = categories.filter(c => c.classification === 'despesa' && c.isActive)
  const incomeCategories  = categories.filter(c => c.classification === 'receita' && c.isActive)
  const prevYears         = years.filter(y => y.id !== yearId)

  if (isLoading) return <div className="p-8 text-gray-400 text-sm">{t('common.loading')}</div>

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title={t('nav.budget')}
        actions={
          <div className="flex items-center gap-3">
            {isAdmin && prevYears.length > 0 && (
              <Button
                variant="secondary" size="sm"
                onClick={() => { if (confirm(t('budget.confirmCopy'))) copyMutation.mutate(prevYears[0].id) }}
                disabled={copyMutation.isPending}
              >
                {t('budget.copyFromPrev')}
              </Button>
            )}
            <select
              value={yearId} onChange={e => setSelectedYearId(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </div>
        }
      />

      <div className="flex-1 overflow-auto px-8 pb-8">
        {!isAdmin && (
          <p className="text-xs text-gray-400 mb-3">{t('budget.readOnly')}</p>
        )}
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-white z-10">
            <tr>
              <th className="text-left py-2 pr-3 font-semibold text-gray-700 w-44">Categoria</th>
              {MONTH_LABELS.map((m, i) => (
                <th key={i} className="text-right py-2 px-1.5 font-semibold text-gray-500 uppercase w-20">{m}</th>
              ))}
              <th className="text-right py-2 pl-2 font-semibold text-gray-700">Total</th>
            </tr>
          </thead>
          <tbody>
            <SectionHeader label="DESPESAS" color="bg-red-50 text-red-800" colCount={SCHOOL_MONTHS.length + 2} />
            {expenseCategories.map(cat => (
              <CategoryRow key={cat.id} catId={cat.id} catName={cat.namePt}
                isAdmin={isAdmin} months={SCHOOL_MONTHS}
                getAmount={getAmount} onCommit={handleCommit} colorClass="text-red-900" />
            ))}
            <TotalRow label="Total Despesas" months={SCHOOL_MONTHS}
              getValue={m => expenseCategories.reduce((s, c) => s + getAmount(c.id, m), 0)}
              className="bg-red-50 font-semibold text-red-900" />

            <SectionHeader label="RECEITAS" color="bg-green-50 text-green-800" colCount={SCHOOL_MONTHS.length + 2} />
            {incomeCategories.map(cat => (
              <CategoryRow key={cat.id} catId={cat.id} catName={cat.namePt}
                isAdmin={isAdmin} months={SCHOOL_MONTHS}
                getAmount={getAmount} onCommit={handleCommit} colorClass="text-green-900" />
            ))}
            <TotalRow label="Total Receitas" months={SCHOOL_MONTHS}
              getValue={m => incomeCategories.reduce((s, c) => s + getAmount(c.id, m), 0)}
              className="bg-green-50 font-semibold text-green-900" />

            <TotalRow label="Balanço" months={SCHOOL_MONTHS}
              getValue={m =>
                incomeCategories.reduce((s, c) => s + getAmount(c.id, m), 0) -
                expenseCategories.reduce((s, c) => s + getAmount(c.id, m), 0)
              }
              className="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-300"
              colorize />
          </tbody>
        </table>
      </div>
    </div>
  )
}
