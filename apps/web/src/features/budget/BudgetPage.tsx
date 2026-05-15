import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiClient } from '@/lib/api-client'
import { useSchoolYears, currentSchoolYearName } from '@/hooks/useSchoolYear'
import { useCategories } from '@/hooks/useCategories'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { auth } from '@/lib/auth'
import clsx from 'clsx'
import type { BudgetEntryDTO, BudgetExecutionDTO, CategoryDTO, SchoolYearDTO } from '@document-intel/shared-types'

const SCHOOL_MONTHS = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8]
const MONTH_LABELS  = ['Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago']

type Tab = 'planning' | 'execution'

function fmtK(n: number) {
  if (n === 0) return '—'
  return n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}
function fmt0(n: number) { return n === 0 ? '' : n.toLocaleString('pt-PT', { maximumFractionDigits: 0 }) }

function EditableCell({ value, onCommit }: { value: number; onCommit: (raw: string) => void }) {
  const [raw, setRaw] = useState(value === 0 ? '' : String(value))
  const ref = useRef<HTMLInputElement>(null)
  return (
    <input ref={ref} type="text" inputMode="numeric" value={raw}
      onChange={e => setRaw(e.target.value)}
      onFocus={() => ref.current?.select()}
      onBlur={() => onCommit(raw)}
      placeholder="—"
      className="w-full text-right text-xs tabular-nums px-1 py-0.5 rounded border border-transparent
                 hover:border-gray-300 focus:border-brand-500 focus:outline-none bg-transparent focus:bg-white"
    />
  )
}

function TableHead() {
  return (
    <thead className="sticky top-0 bg-white z-10">
      <tr>
        <th className="text-left py-2 pr-3 font-semibold text-gray-700 w-44">Categoria</th>
        {MONTH_LABELS.map((m, i) => (
          <th key={i} className="text-right py-2 px-1.5 font-semibold text-gray-500 uppercase w-20">{m}</th>
        ))}
        <th className="text-right py-2 pl-2 font-semibold text-gray-700">Total</th>
      </tr>
    </thead>
  )
}

function SectionHeader({ label, color, colCount }: { label: string; color: string; colCount: number }) {
  return (
    <tr>
      <td colSpan={colCount} className={clsx('py-1.5 px-2 text-xs font-bold uppercase tracking-wider', color)}>
        {label}
      </td>
    </tr>
  )
}

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
            {fmtK(v)}
          </td>
        )
      })}
      <td className={clsx('py-2 pl-2 text-right tabular-nums text-xs',
        colorize && yearTotal !== 0 && (yearTotal > 0 ? 'text-green-700' : 'text-red-700'))}>
        {fmtK(yearTotal)}
      </td>
    </tr>
  )
}

function CopyBudgetModal({ open, onClose, toYearId, toYearName, otherYears }: {
  open: boolean; onClose: () => void
  toYearId: string; toYearName: string; otherYears: SchoolYearDTO[]
}) {
  const qc = useQueryClient()
  const [fromYearId, setFromYearId] = useState(otherYears[0]?.id ?? '')
  const [mode, setMode] = useState<'planned' | 'executed'>('planned')

  const copyMutation = useMutation({
    mutationFn: () => apiClient.post('/v1/budget/copy', { fromYearId, toYearId, mode }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget', toYearId] })
      qc.invalidateQueries({ queryKey: ['budget-execution', toYearId] })
      onClose()
    },
  })

  const fromName  = otherYears.find(y => y.id === fromYearId)?.name ?? ''
  const modeLabel = mode === 'executed' ? 'executado' : 'planeado'

  return (
    <Modal open={open} onClose={onClose} title="Copiar Orçamento">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Copiar de</label>
          <select value={fromYearId} onChange={e => setFromYearId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            {otherYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de dados</label>
          <select value={mode} onChange={e => setMode(e.target.value as 'planned' | 'executed')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="planned">Planeado</option>
            <option value="executed">Executado</option>
          </select>
        </div>
        <p className="text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Os valores {modeLabel}s de <strong>{fromName}</strong> serão copiados para <strong>{toYearName}</strong>. Esta ação sobrescreve os valores existentes.
        </p>
        {copyMutation.isError && (
          <p className="text-sm text-red-600">Erro ao copiar orçamento.</p>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => copyMutation.mutate()}
          disabled={copyMutation.isPending || !fromYearId}>
          {copyMutation.isPending ? 'A copiar…' : 'Confirmar cópia'}
        </Button>
      </div>
    </Modal>
  )
}

function PlanningTab({
  yearId, categories, isAdmin, yearName,
}: {
  yearId: string; categories: CategoryDTO[]; isAdmin: boolean; yearName: string
}) {
  const qc = useQueryClient()
  const { data: budget = [] } = useQuery({
    queryKey: ['budget', yearId],
    queryFn:  () => apiClient.get<BudgetEntryDTO[]>(`/v1/budget/${yearId}`),
    enabled:  !!yearId,
  })

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

  function handleCommit(catId: string, month: number, raw: string) {
    if (!isAdmin) return
    const val = parseFloat(raw.replace(',', '.')) || 0
    setEdits(prev => ({ ...prev, [bkey(catId, month)]: val }))
    upsertMutation.mutate({ categoryId: catId, month, amount: val })
  }

  const expenseCats = categories.filter(c => c.classification === 'despesa' && c.isActive)
  const incomeCats  = categories.filter(c => c.classification === 'receita' && c.isActive)
  const cols = SCHOOL_MONTHS.length + 2

  function exportCsv() {
    const header = ['Categoria', 'Tipo', ...MONTH_LABELS, 'Total']
    const rows: string[][] = [header]

    rows.push(['DESPESAS', '', ...MONTH_LABELS.map(() => ''), ''])
    expenseCats.forEach(cat => {
      const monthVals = SCHOOL_MONTHS.map(m => String(getAmount(cat.id, m)))
      const total = SCHOOL_MONTHS.reduce((s, m) => s + getAmount(cat.id, m), 0)
      rows.push([cat.namePt, 'despesa', ...monthVals, String(total)])
    })
    rows.push(['RECEITAS', '', ...MONTH_LABELS.map(() => ''), ''])
    incomeCats.forEach(cat => {
      const monthVals = SCHOOL_MONTHS.map(m => String(getAmount(cat.id, m)))
      const total = SCHOOL_MONTHS.reduce((s, m) => s + getAmount(cat.id, m), 0)
      rows.push([cat.namePt, 'receita', ...monthVals, String(total)])
    })

    const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `orcamento_${yearName}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <>
    <div className="flex justify-end mb-2">
      <Button variant="secondary" size="sm" onClick={exportCsv}>↓ Exportar CSV</Button>
    </div>
    <table className="w-full text-xs border-collapse">
      <TableHead />
      <tbody>
        <SectionHeader label="DESPESAS" color="bg-red-50 text-red-800" colCount={cols} />
        {expenseCats.map(cat => {
          const yearTotal = SCHOOL_MONTHS.reduce((s, m) => s + getAmount(cat.id, m), 0)
          return (
            <tr key={cat.id} className="hover:bg-gray-50 border-b border-gray-100">
              <td className="py-1 pr-3 text-gray-700 font-medium truncate max-w-[11rem]">{cat.namePt}</td>
              {SCHOOL_MONTHS.map(m => (
                <td key={m} className="py-1 px-1">
                  {isAdmin
                    ? <EditableCell value={getAmount(cat.id, m)} onCommit={raw => handleCommit(cat.id, m, raw)} />
                    : <span className="block text-right tabular-nums text-gray-600 px-1">{fmt0(getAmount(cat.id, m))}</span>
                  }
                </td>
              ))}
              <td className="py-1 pl-2 text-right font-semibold tabular-nums text-red-900">{fmt0(yearTotal)}</td>
            </tr>
          )
        })}
        <TotalRow label="Total Despesas" months={SCHOOL_MONTHS}
          getValue={m => expenseCats.reduce((s, c) => s + getAmount(c.id, m), 0)}
          className="bg-red-50 font-semibold text-red-900" />

        <SectionHeader label="RECEITAS" color="bg-green-50 text-green-800" colCount={cols} />
        {incomeCats.map(cat => {
          const yearTotal = SCHOOL_MONTHS.reduce((s, m) => s + getAmount(cat.id, m), 0)
          return (
            <tr key={cat.id} className="hover:bg-gray-50 border-b border-gray-100">
              <td className="py-1 pr-3 text-gray-700 font-medium truncate max-w-[11rem]">{cat.namePt}</td>
              {SCHOOL_MONTHS.map(m => (
                <td key={m} className="py-1 px-1">
                  {isAdmin
                    ? <EditableCell value={getAmount(cat.id, m)} onCommit={raw => handleCommit(cat.id, m, raw)} />
                    : <span className="block text-right tabular-nums text-gray-600 px-1">{fmt0(getAmount(cat.id, m))}</span>
                  }
                </td>
              ))}
              <td className="py-1 pl-2 text-right font-semibold tabular-nums text-green-900">{fmt0(yearTotal)}</td>
            </tr>
          )
        })}
        <TotalRow label="Total Receitas" months={SCHOOL_MONTHS}
          getValue={m => incomeCats.reduce((s, c) => s + getAmount(c.id, m), 0)}
          className="bg-green-50 font-semibold text-green-900" />

        <TotalRow label="Balanço" months={SCHOOL_MONTHS}
          getValue={m =>
            incomeCats.reduce((s, c) => s + getAmount(c.id, m), 0) -
            expenseCats.reduce((s, c) => s + getAmount(c.id, m), 0)
          }
          className="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-300"
          colorize />
      </tbody>
    </table>
    </>
  )
}

function ExecutionTab({ yearId, categories }: { yearId: string; categories: CategoryDTO[] }) {
  const { data: execution = [] } = useQuery({
    queryKey: ['budget-execution', yearId],
    queryFn:  () => apiClient.get<BudgetExecutionDTO[]>(`/v1/budget/${yearId}/execution`),
    enabled:  !!yearId,
  })

  const execMap = useMemo(() => {
    const m: Record<string, BudgetExecutionDTO> = {}
    execution.forEach(e => { m[`${e.categoryId}|${e.month}`] = e })
    return m
  }, [execution])

  const getPlanned = (catId: string, month: number) => execMap[`${catId}|${month}`]?.plannedAmount ?? 0
  const getActual  = (catId: string, month: number) => execMap[`${catId}|${month}`]?.actualAmount  ?? 0

  const expenseCats = categories.filter(c => c.classification === 'despesa' && c.isActive)
  const incomeCats  = categories.filter(c => c.classification === 'receita' && c.isActive)
  const cols = SCHOOL_MONTHS.length + 2

  function CatRows({ cat, isExpense }: { cat: CategoryDTO; isExpense: boolean }) {
    const actualTotal  = SCHOOL_MONTHS.reduce((s, m) => s + getActual(cat.id, m), 0)
    const plannedTotal = SCHOOL_MONTHS.reduce((s, m) => s + getPlanned(cat.id, m), 0)
    return (
      <>
        <tr className="border-b border-gray-100 hover:bg-gray-50">
          <td className="py-1 pr-3 font-medium text-gray-800 truncate max-w-[11rem]" rowSpan={2}>{cat.namePt}</td>
          {SCHOOL_MONTHS.map(m => {
            const actual  = getActual(cat.id, m)
            const planned = getPlanned(cat.id, m)
            const over = isExpense ? actual > planned && planned > 0 : actual < planned && planned > 0
            return (
              <td key={m} className={clsx('py-1 px-1.5 text-right tabular-nums font-semibold',
                actual === 0 ? 'text-gray-300' : over ? 'text-red-700' : 'text-green-700')}>
                {fmt0(actual)}
              </td>
            )
          })}
          <td className={clsx('py-1 pl-2 text-right tabular-nums font-semibold',
            actualTotal === 0 ? 'text-gray-300'
              : (isExpense ? actualTotal > plannedTotal : actualTotal < plannedTotal) && plannedTotal > 0
              ? 'text-red-700' : 'text-green-700')}>
            {fmt0(actualTotal)}
          </td>
        </tr>
        <tr className="border-b border-gray-100">
          {SCHOOL_MONTHS.map(m => (
            <td key={m} className="pb-1.5 px-1.5 text-right tabular-nums text-gray-400 text-[10px]">
              {fmt0(getPlanned(cat.id, m))}
            </td>
          ))}
          <td className="pb-1.5 pl-2 text-right tabular-nums text-gray-400 text-[10px]">{fmt0(plannedTotal)}</td>
        </tr>
      </>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-gray-500">
        <span><strong className="text-gray-800">Valor superior</strong> = executado</span>
        <span><strong className="text-gray-400">Valor inferior</strong> = planeado</span>
        <span className="text-green-700 font-semibold">Verde</span> = dentro do orçamento
        <span className="text-red-700 font-semibold">Vermelho</span> = fora do orçamento
      </div>

      <table className="w-full text-xs border-collapse">
        <TableHead />
        <tbody>
          <SectionHeader label="DESPESAS" color="bg-red-50 text-red-800" colCount={cols} />
          {expenseCats.map(cat => <CatRows key={cat.id} cat={cat} isExpense={true} />)}
          <TotalRow label="Total Executado" months={SCHOOL_MONTHS}
            getValue={m => expenseCats.reduce((s, c) => s + getActual(c.id, m), 0)}
            className="bg-red-50 font-semibold text-red-900" />
          <TotalRow label="Total Planeado" months={SCHOOL_MONTHS}
            getValue={m => expenseCats.reduce((s, c) => s + getPlanned(c.id, m), 0)}
            className="text-gray-400" />

          <SectionHeader label="RECEITAS" color="bg-green-50 text-green-800" colCount={cols} />
          {incomeCats.map(cat => <CatRows key={cat.id} cat={cat} isExpense={false} />)}
          <TotalRow label="Total Executado" months={SCHOOL_MONTHS}
            getValue={m => incomeCats.reduce((s, c) => s + getActual(c.id, m), 0)}
            className="bg-green-50 font-semibold text-green-900" />
          <TotalRow label="Total Planeado" months={SCHOOL_MONTHS}
            getValue={m => incomeCats.reduce((s, c) => s + getPlanned(c.id, m), 0)}
            className="text-gray-400" />

          <TotalRow label="Balanço Executado" months={SCHOOL_MONTHS}
            getValue={m =>
              incomeCats.reduce((s, c) => s + getActual(c.id, m), 0) -
              expenseCats.reduce((s, c) => s + getActual(c.id, m), 0)
            }
            className="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-300"
            colorize />
        </tbody>
      </table>
    </div>
  )
}

export default function BudgetPage() {
  const { t } = useTranslation()
  const user    = auth.getUser()
  const isAdmin = user?.role === 'admin'

  const { data: years = [] }      = useSchoolYears()
  const { data: categories = [] } = useCategories()
  const currentYearName = currentSchoolYearName()
  const currentYear     = years.find(y => y.name === currentYearName) ?? years[0]

  const [selectedYearId, setSelectedYearId] = useState('')
  const [tab, setTab]       = useState<Tab>('planning')
  const [showCopyModal, setShowCopyModal] = useState(false)

  const yearId     = selectedYearId || currentYear?.id || ''
  const yearName   = years.find(y => y.id === yearId)?.name ?? ''
  const otherYears = years.filter(y => y.id !== yearId)

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title={t('nav.budget')}
        actions={
          <div className="flex items-center gap-3">
            {isAdmin && otherYears.length > 0 && tab === 'planning' && (
              <Button variant="secondary" size="sm" onClick={() => setShowCopyModal(true)}>
                Copiar…
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

      <div className="px-8 pb-0 flex gap-1 border-b border-gray-200">
        {(['planning', 'execution'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {t === 'planning' ? 'Planeamento' : 'Execução'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto px-8 pt-4 pb-8">
        {!isAdmin && tab === 'planning' && (
          <p className="text-xs text-gray-400 mb-3">{t('budget.readOnly')}</p>
        )}
        {!yearId ? (
          <p className="text-sm text-amber-600">No school year found. Create one first in School Years settings.</p>
        ) : tab === 'planning' ? (
          <PlanningTab yearId={yearId} categories={categories} isAdmin={isAdmin} yearName={yearName} />
        ) : (
          <ExecutionTab yearId={yearId} categories={categories} />
        )}
      </div>

      {showCopyModal && (
        <CopyBudgetModal
          open
          onClose={() => setShowCopyModal(false)}
          toYearId={yearId}
          toYearName={yearName}
          otherYears={otherYears}
        />
      )}
    </div>
  )
}
