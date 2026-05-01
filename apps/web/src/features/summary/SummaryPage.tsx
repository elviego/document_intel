import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiClient } from '@/lib/api-client'
import { useSchoolYears, currentSchoolYearName } from '@/hooks/useSchoolYear'
import { PageHeader } from '@/components/ui/PageHeader'
import clsx from 'clsx'

// School year runs Sep(9)–Aug(8). Months in display order:
const SCHOOL_MONTHS = [9,10,11,12,1,2,3,4,5,6,7,8]
const MONTH_LABELS  = ['set','out','nov','dez','jan','fev','mar','abr','mai','jun','jul','ago']

interface SummaryRow { categoryId: string; categoryName: string; classification: string; month: number; total: number }
interface BudgetEntry { categoryId: string; month: number; plannedAmount: number }

function useSummary(schoolYearId: string) {
  return useQuery({
    queryKey: ['summary', schoolYearId],
    queryFn:  () => apiClient.get<SummaryRow[]>(`/v1/transactions/summary/${schoolYearId}`),
    enabled:  !!schoolYearId,
  })
}

function useBudget(schoolYearId: string) {
  return useQuery({
    queryKey: ['budget', schoolYearId],
    queryFn:  () => apiClient.get<BudgetEntry[]>(`/v1/budget/${schoolYearId}`),
    enabled:  !!schoolYearId,
  })
}

function fmt(n: number) {
  if (n === 0) return '—'
  return n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

function varianceColor(actual: number, planned: number, isExpense: boolean) {
  if (!planned) return ''
  const over = isExpense ? actual < planned : actual > planned   // expenses: under=good; income: over=good
  return over ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
}

export default function SummaryPage() {
  const { t, i18n } = useTranslation()
  const { data: years = [] } = useSchoolYears()
  const currentYearName = currentSchoolYearName()
  const currentYear = years.find(y => y.name === currentYearName) ?? years[0]
  const [selectedYearId, setSelectedYearId] = useState('')
  const [showPlanned, setShowPlanned] = useState(true)

  const yearId = selectedYearId || currentYear?.id || ''
  const { data: rows = [], isLoading } = useSummary(yearId)
  const { data: budget = [] } = useBudget(yearId)

  // Build lookup: categoryId → month → { actual, planned }
  const budgetMap = useMemo(() => {
    const m: Record<string, Record<number, number>> = {}
    budget.forEach(b => { (m[b.categoryId] ??= {})[b.month] = b.plannedAmount })
    return m
  }, [budget])

  // Group by classification then category
  const grouped = useMemo(() => {
    const map: Record<string, Record<string, Record<number, number>>> = {
      despesa: {}, receita: {},
    }
    rows.forEach(r => {
      const cl = r.classification === 'receita' ? 'receita' : 'despesa'
      ;(map[cl][r.categoryName] ??= {})[r.month] = r.total
    })
    return map
  }, [rows])

  function sectionTotal(classification: 'receita' | 'despesa', month: number) {
    return Object.values(grouped[classification]).reduce((s, byMonth) => s + (byMonth[month] ?? 0), 0)
  }

  if (isLoading) return <div className="p-8 text-gray-400 text-sm">{t('common.loading')}</div>

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title={t('nav.summary')}
        actions={
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={showPlanned} onChange={e => setShowPlanned(e.target.checked)} />
              {t('budget.planned')}
            </label>
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
            {/* ── DESPESAS ── */}
            <SectionHeader label="DESPESAS" colSpan={SCHOOL_MONTHS.length + 2} color="bg-red-50 text-red-800" />
            {Object.entries(grouped.despesa).map(([catName, byMonth]) => {
              const catId = rows.find(r => r.categoryName === catName)?.categoryId ?? ''
              const yearTotal = Object.values(byMonth).reduce((s, v) => s + v, 0)
              return (
                <tr key={catName} className="hover:bg-gray-50 border-b border-gray-100">
                  <td className="py-1.5 pr-3 text-gray-700 font-medium truncate max-w-[11rem]">{catName}</td>
                  {SCHOOL_MONTHS.map(m => {
                    const actual  = byMonth[m] ?? 0
                    const planned = budgetMap[catId]?.[m] ?? 0
                    return (
                      <td key={m} className="py-1.5 px-1.5 text-right">
                        <span className={clsx('tabular-nums', actual && varianceColor(actual, planned, true))}>
                          {fmt(actual)}
                        </span>
                        {showPlanned && planned > 0 && (
                          <div className="text-gray-300 leading-none">{fmt(planned)}</div>
                        )}
                      </td>
                    )
                  })}
                  <td className="py-1.5 pl-2 text-right font-semibold tabular-nums text-gray-900">{fmt(yearTotal)}</td>
                </tr>
              )
            })}
            <TotalRow label="Total Despesas" months={SCHOOL_MONTHS} getValue={m => sectionTotal('despesa', m)}
              className="bg-red-50 font-semibold text-red-900" />

            {/* ── RECEITAS ── */}
            <SectionHeader label="RECEITAS" colSpan={SCHOOL_MONTHS.length + 2} color="bg-green-50 text-green-800" />
            {Object.entries(grouped.receita).map(([catName, byMonth]) => {
              const catId = rows.find(r => r.categoryName === catName)?.categoryId ?? ''
              const yearTotal = Object.values(byMonth).reduce((s, v) => s + v, 0)
              return (
                <tr key={catName} className="hover:bg-gray-50 border-b border-gray-100">
                  <td className="py-1.5 pr-3 text-gray-700 font-medium truncate max-w-[11rem]">{catName}</td>
                  {SCHOOL_MONTHS.map(m => {
                    const actual  = byMonth[m] ?? 0
                    const planned = budgetMap[catId]?.[m] ?? 0
                    return (
                      <td key={m} className="py-1.5 px-1.5 text-right">
                        <span className={clsx('tabular-nums', actual && varianceColor(actual, planned, false))}>
                          {fmt(actual)}
                        </span>
                        {showPlanned && planned > 0 && (
                          <div className="text-gray-300 leading-none">{fmt(planned)}</div>
                        )}
                      </td>
                    )
                  })}
                  <td className="py-1.5 pl-2 text-right font-semibold tabular-nums text-gray-900">{fmt(yearTotal)}</td>
                </tr>
              )
            })}
            <TotalRow label="Total Receitas" months={SCHOOL_MONTHS} getValue={m => sectionTotal('receita', m)}
              className="bg-green-50 font-semibold text-green-900" />

            {/* ── BALANÇO ── */}
            <TotalRow label="Balanço" months={SCHOOL_MONTHS}
              getValue={m => sectionTotal('receita', m) + sectionTotal('despesa', m)}
              className="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-300"
              colorize />
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SectionHeader({ label, colSpan, color }: { label: string; colSpan: number; color: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className={clsx('py-1.5 px-2 text-xs font-bold uppercase tracking-wider', color)}>
        {label}
      </td>
    </tr>
  )
}

function TotalRow({
  label, months, getValue, className, colorize,
}: {
  label: string; months: number[]; getValue: (m: number) => number; className?: string; colorize?: boolean
}) {
  const yearTotal = months.reduce((s, m) => s + getValue(m), 0)
  return (
    <tr className={clsx('border-t border-gray-300', className)}>
      <td className="py-2 pr-3">{label}</td>
      {months.map(m => {
        const v = getValue(m)
        return (
          <td key={m} className={clsx('py-2 px-1.5 text-right tabular-nums',
            colorize && v !== 0 && (v > 0 ? 'text-green-700' : 'text-red-700'))}>
            {fmt(v)}
          </td>
        )
      })}
      <td className={clsx('py-2 pl-2 text-right tabular-nums',
        colorize && yearTotal !== 0 && (yearTotal > 0 ? 'text-green-700' : 'text-red-700'))}>
        {fmt(yearTotal)}
      </td>
    </tr>
  )
}
