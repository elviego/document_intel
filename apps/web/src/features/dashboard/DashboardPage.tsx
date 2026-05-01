import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { apiClient } from '@/lib/api-client'
import { useSchoolYears, currentSchoolYearName } from '@/hooks/useSchoolYear'
import { PageHeader } from '@/components/ui/PageHeader'

const SCHOOL_MONTHS = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8]
const MONTH_LABELS  = ['Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago']

interface SummaryRow {
  categoryId: string
  categoryName: string
  classification: string
  month: number
  total: number
}

function useSummary(schoolYearId: string) {
  return useQuery({
    queryKey: ['summary', schoolYearId],
    queryFn:  () => apiClient.get<SummaryRow[]>(`/v1/transactions/summary/${schoolYearId}`),
    enabled:  !!schoolYearId,
  })
}

function fmt(n: number) {
  return n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-1 shadow-sm">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const { data: years = [] } = useSchoolYears()
  const currentYearName = currentSchoolYearName()
  const currentYear = years.find(y => y.name === currentYearName) ?? years[0]
  const yearId = currentYear?.id ?? ''

  const { data: rows = [], isLoading } = useSummary(yearId)

  // Aggregate totals
  const { totalIncome, totalExpense, chartData } = useMemo(() => {
    let income = 0
    let expense = 0

    // Build per-month income/expense
    const byMonth: Record<number, { income: number; expense: number }> = {}
    SCHOOL_MONTHS.forEach(m => { byMonth[m] = { income: 0, expense: 0 } })

    rows.forEach(r => {
      if (r.classification === 'receita') {
        income += r.total
        byMonth[r.month].income += r.total
      } else {
        expense += r.total   // total is already negative from DB
        byMonth[r.month].expense += r.total
      }
    })

    const chartData = SCHOOL_MONTHS.map((m, i) => ({
      name: MONTH_LABELS[i],
      Receitas: Math.round(byMonth[m].income),
      Despesas: Math.round(Math.abs(byMonth[m].expense)),
    }))

    return { totalIncome: income, totalExpense: expense, chartData }
  }, [rows])

  const balance = totalIncome + totalExpense

  // Current month (today's month)
  const now = new Date()
  const thisMonth = now.getMonth() + 1
  const thisMonthRows = rows.filter(r => r.month === thisMonth)
  const monthIncome  = thisMonthRows.filter(r => r.classification === 'receita').reduce((s, r) => s + r.total, 0)
  const monthExpense = thisMonthRows.filter(r => r.classification === 'despesa').reduce((s, r) => s + r.total, 0)

  if (isLoading) return <div className="p-8 text-gray-400 text-sm">{t('common.loading')}</div>

  return (
    <div className="h-full flex flex-col">
      <PageHeader title={t('nav.dashboard')} subtitle={currentYear?.name} />

      <div className="flex-1 overflow-auto px-8 pb-8 space-y-6">

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label={t('common.income')}
            value={fmt(totalIncome)}
            sub={t('dashboard.yearToDate')}
            color="text-green-700"
          />
          <KpiCard
            label={t('common.expense')}
            value={fmt(totalExpense)}
            sub={t('dashboard.yearToDate')}
            color="text-red-700"
          />
          <KpiCard
            label={t('common.balance')}
            value={fmt(balance)}
            sub={t('dashboard.yearToDate')}
            color={balance >= 0 ? 'text-green-700' : 'text-red-700'}
          />
          <KpiCard
            label={t('dashboard.thisMonth')}
            value={fmt(monthIncome + monthExpense)}
            sub={`${fmt(monthIncome)} / ${fmt(monthExpense)}`}
            color={(monthIncome + monthExpense) >= 0 ? 'text-green-700' : 'text-red-700'}
          />
        </div>

        {/* Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">{t('dashboard.monthlyOverview')}</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Bar dataKey="Receitas" fill="#16a34a" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Despesas" fill="#dc2626" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top expense categories */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">{t('dashboard.topExpenses')}</h2>
          <TopCategoriesTable rows={rows} classification="despesa" />
        </div>

      </div>
    </div>
  )
}

function TopCategoriesTable({ rows, classification }: { rows: SummaryRow[]; classification: string }) {
  const byCategory = useMemo(() => {
    const m: Record<string, { name: string; total: number }> = {}
    rows.filter(r => r.classification === classification).forEach(r => {
      if (!m[r.categoryId]) m[r.categoryId] = { name: r.categoryName, total: 0 }
      m[r.categoryId].total += r.total
    })
    return Object.values(m).sort((a, b) => a.total - b.total).slice(0, 8)
  }, [rows, classification])

  const maxAbs = Math.max(...byCategory.map(c => Math.abs(c.total)), 1)

  return (
    <div className="space-y-1.5">
      {byCategory.map(c => (
        <div key={c.name} className="flex items-center gap-3">
          <span className="text-xs text-gray-600 w-44 truncate">{c.name}</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-400 rounded-full"
              style={{ width: `${(Math.abs(c.total) / maxAbs) * 100}%` }}
            />
          </div>
          <span className="text-xs font-mono text-red-700 w-20 text-right">{fmt(c.total)}</span>
        </div>
      ))}
    </div>
  )
}
