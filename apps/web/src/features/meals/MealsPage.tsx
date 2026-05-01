import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { apiClient } from '@/lib/api-client'
import { useSchoolYears, currentSchoolYearName } from '@/hooks/useSchoolYear'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { auth } from '@/lib/auth'
import type { ChildDTO, MealRecordDTO, ChildMonthlyBillingDTO } from '@fin-tribe/shared-types'

interface MealPricing {
  id: string; schoolYearId: string; mealType: 'com_sopa' | 'sem_sopa'
  schoolCost: number; parentPrice: number
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useChildren(schoolYearId: string) {
  return useQuery({
    queryKey: ['children', schoolYearId],
    queryFn:  () => apiClient.get<ChildDTO[]>(`/v1/meals/children/${schoolYearId}`),
    enabled:  !!schoolYearId,
  })
}

function useMealRecords(date: string) {
  return useQuery({
    queryKey: ['meal-records', date],
    queryFn:  () => apiClient.get<MealRecordDTO[]>(`/v1/meals/records?from=${date}&to=${date}`),
    enabled:  !!date,
  })
}

function useBilling(schoolYearId: string, year: number, month: number) {
  return useQuery({
    queryKey: ['meal-billing', schoolYearId, year, month],
    queryFn:  () => apiClient.get<ChildMonthlyBillingDTO[]>(
      `/v1/meals/billing/${schoolYearId}/${year}/${month}`
    ),
    enabled:  !!schoolYearId,
  })
}

function usePricing(schoolYearId: string) {
  return useQuery({
    queryKey: ['meal-pricing', schoolYearId],
    queryFn:  () => apiClient.get<MealPricing[]>(`/v1/meals/pricing/${schoolYearId}`),
    enabled:  !!schoolYearId,
  })
}

type Tab = 'daily' | 'billing' | 'pricing' | 'children'

// ─── Add Child Modal ──────────────────────────────────────────────────────────
function AddChildModal({ open, onClose, schoolYearId }: { open: boolean; onClose: () => void; schoolYearId: string }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState({ fullName: '', tuitionType: 'mensalidade' })

  const mutation = useMutation({
    mutationFn: () => apiClient.post('/v1/meals/children', { ...form, schoolYearId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['children'] }); onClose() },
  })

  return (
    <Modal open={open} onClose={onClose} title={t('meals.addChild')}>
      <div className="space-y-3">
        <Input label={t('meals.childName')} value={form.fullName}
          onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
        <Input label={t('meals.tuitionType')} value={form.tuitionType}
          onChange={e => setForm(f => ({ ...f, tuitionType: e.target.value }))} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.fullName}>
          {mutation.isPending ? t('common.loading') : t('common.save')}
        </Button>
      </div>
    </Modal>
  )
}

// ─── Daily Tab ────────────────────────────────────────────────────────────────
function DailyTab({ schoolYearId }: { schoolYearId: string }) {
  const { t } = useTranslation()
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const { data: children = [] } = useChildren(schoolYearId)
  const { data: records = [], isLoading } = useMealRecords(date)
  const qc = useQueryClient()

  const toggleMutation = useMutation({
    mutationFn: ({ childId, mealType }: { childId: string; mealType: 'com_sopa' | 'sem_sopa' }) => {
      const existing = records.find(r => r.childId === childId && r.mealType === mealType)
      if (existing) return apiClient.delete(`/v1/meals/records/${existing.id}`)
      return apiClient.post('/v1/meals/records', { childId, date, mealType })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-records', date] }),
  })

  const activeChildren = children.filter(c => c.isActive)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">Data</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500" />
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">{t('common.loading')}</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b border-gray-200 text-xs text-gray-500 uppercase">
              <th className="pb-2 pr-4 font-medium">{t('meals.childName')}</th>
              <th className="pb-2 pr-4 font-medium text-center">{t('meals.withSoup')}</th>
              <th className="pb-2 font-medium text-center">{t('meals.withoutSoup')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activeChildren.map(child => {
              const hasSoup   = records.some(r => r.childId === child.id && r.mealType === 'com_sopa')
              const hasNoSoup = records.some(r => r.childId === child.id && r.mealType === 'sem_sopa')
              return (
                <tr key={child.id} className="hover:bg-gray-50">
                  <td className="py-2 pr-4 font-medium text-gray-900">{child.fullName}</td>
                  <td className="py-2 pr-4 text-center">
                    <button
                      onClick={() => toggleMutation.mutate({ childId: child.id, mealType: 'com_sopa' })}
                      className={`w-7 h-7 rounded-full border-2 text-xs font-bold transition-colors ${
                        hasSoup ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-300 hover:border-green-400'
                      }`}
                    >
                      ✓
                    </button>
                  </td>
                  <td className="py-2 text-center">
                    <button
                      onClick={() => toggleMutation.mutate({ childId: child.id, mealType: 'sem_sopa' })}
                      className={`w-7 h-7 rounded-full border-2 text-xs font-bold transition-colors ${
                        hasNoSoup ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 text-gray-300 hover:border-blue-400'
                      }`}
                    >
                      ✓
                    </button>
                  </td>
                </tr>
              )
            })}
            {activeChildren.length === 0 && (
              <tr><td colSpan={3} className="py-8 text-center text-sm text-gray-400">Nenhuma criança ativa</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─── Billing Tab ──────────────────────────────────────────────────────────────
function BillingTab({ schoolYearId }: { schoolYearId: string }) {
  const { t } = useTranslation()
  const now  = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const { data: billing = [], isLoading } = useBilling(schoolYearId, year, month)

  const monthNames = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const totalParent = billing.reduce((s, b) => s + b.parentCharge, 0)
  const totalSchool = billing.reduce((s, b) => s + b.schoolCost,   0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={month} onChange={e => setMonth(Number(e.target.value))}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white">
          {monthNames.slice(1).map((n, i) => <option key={i + 1} value={i + 1}>{n}</option>)}
        </select>
        <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm w-24" />
      </div>
      {isLoading ? (
        <p className="text-sm text-gray-400">{t('common.loading')}</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b border-gray-200 text-xs text-gray-500 uppercase">
              <th className="pb-2 pr-4 font-medium">{t('meals.childName')}</th>
              <th className="pb-2 pr-4 font-medium text-center">{t('meals.withSoup')}</th>
              <th className="pb-2 pr-4 font-medium text-center">{t('meals.withoutSoup')}</th>
              <th className="pb-2 pr-4 font-medium text-right">{t('meals.schoolCost')}</th>
              <th className="pb-2 font-medium text-right">{t('meals.parentCharge')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {billing.map(b => (
              <tr key={b.childId} className="hover:bg-gray-50">
                <td className="py-2 pr-4 font-medium text-gray-900">{b.childName}</td>
                <td className="py-2 pr-4 text-center">{b.withSoupCount}</td>
                <td className="py-2 pr-4 text-center">{b.withoutSoupCount}</td>
                <td className="py-2 pr-4 text-right font-mono text-gray-600">
                  {b.schoolCost.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                </td>
                <td className="py-2 text-right font-mono font-semibold text-gray-900">
                  {b.parentCharge.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
            <tr>
              <td className="py-2 pr-4 text-gray-700" colSpan={3}>Total</td>
              <td className="py-2 pr-4 text-right font-mono text-gray-700">
                {totalSchool.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
              </td>
              <td className="py-2 text-right font-mono text-gray-900">
                {totalParent.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  )
}

// ─── Pricing Tab ──────────────────────────────────────────────────────────────
function PricingTab({ schoolYearId }: { schoolYearId: string }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: pricing = [] } = usePricing(schoolYearId)

  const soupEntry    = pricing.find(p => p.mealType === 'com_sopa')
  const noSoupEntry  = pricing.find(p => p.mealType === 'sem_sopa')

  const [withSoupSchool,    setWithSoupSchool]    = useState('')
  const [withSoupParent,    setWithSoupParent]    = useState('')
  const [withoutSoupSchool, setWithoutSoupSchool] = useState('')
  const [withoutSoupParent, setWithoutSoupParent] = useState('')
  const [saved, setSaved] = useState(false)

  const saveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        apiClient.put('/v1/meals/pricing', {
          schoolYearId, mealType: 'com_sopa',
          schoolCost:  parseFloat(withSoupSchool  || String(soupEntry?.schoolCost  ?? 0)),
          parentPrice: parseFloat(withSoupParent  || String(soupEntry?.parentPrice ?? 0)),
        }),
        apiClient.put('/v1/meals/pricing', {
          schoolYearId, mealType: 'sem_sopa',
          schoolCost:  parseFloat(withoutSoupSchool || String(noSoupEntry?.schoolCost  ?? 0)),
          parentPrice: parseFloat(withoutSoupParent || String(noSoupEntry?.parentPrice ?? 0)),
        }),
      ])
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meal-pricing', schoolYearId] })
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    },
  })

  return (
    <div className="max-w-md space-y-5">
      <p className="text-sm text-gray-500">{t('meals.pricingHint')}</p>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Com Sopa</h3>
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('meals.schoolCost') + ' (€)'} type="number" step="0.01"
            value={withSoupSchool || String(soupEntry?.schoolCost ?? '')}
            onChange={e => setWithSoupSchool(e.target.value)} placeholder="ex: 3.50" />
          <Input label={t('meals.parentCharge') + ' (€)'} type="number" step="0.01"
            value={withSoupParent || String(soupEntry?.parentPrice ?? '')}
            onChange={e => setWithSoupParent(e.target.value)} placeholder="ex: 4.00" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Sem Sopa</h3>
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('meals.schoolCost') + ' (€)'} type="number" step="0.01"
            value={withoutSoupSchool || String(noSoupEntry?.schoolCost ?? '')}
            onChange={e => setWithoutSoupSchool(e.target.value)} placeholder="ex: 2.50" />
          <Input label={t('meals.parentCharge') + ' (€)'} type="number" step="0.01"
            value={withoutSoupParent || String(noSoupEntry?.parentPrice ?? '')}
            onChange={e => setWithoutSoupParent(e.target.value)} placeholder="ex: 3.00" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? t('common.loading') : t('common.save')}
        </Button>
        {saved && <span className="text-sm text-green-600">✓ {t('common.saved')}</span>}
      </div>
    </div>
  )
}

// ─── Children Tab ─────────────────────────────────────────────────────────────
function ChildrenTab({ schoolYearId }: { schoolYearId: string }) {
  const { t } = useTranslation()
  const { data: children = [], isLoading } = useChildren(schoolYearId)
  const [showAdd, setShowAdd] = useState(false)
  const qc = useQueryClient()

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(`/v1/meals/children/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['children'] }),
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowAdd(true)}>+ {t('meals.addChild')}</Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-gray-400">{t('common.loading')}</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b border-gray-200 text-xs text-gray-500 uppercase">
              <th className="pb-2 pr-4 font-medium">{t('meals.childName')}</th>
              <th className="pb-2 pr-4 font-medium">{t('meals.tuitionType')}</th>
              <th className="pb-2 font-medium">{t('common.active')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {children.map(child => (
              <tr key={child.id} className="hover:bg-gray-50">
                <td className="py-2 pr-4 font-medium text-gray-900">{child.fullName}</td>
                <td className="py-2 pr-4 text-gray-500">{child.tuitionType}</td>
                <td className="py-2">
                  <button
                    onClick={() => toggleActive.mutate({ id: child.id, isActive: !child.isActive })}
                    className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                      child.isActive ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      child.isActive ? 'translate-x-4' : ''
                    }`} />
                  </button>
                </td>
              </tr>
            ))}
            {children.length === 0 && (
              <tr><td colSpan={3} className="py-8 text-center text-sm text-gray-400">Nenhuma criança registada</td></tr>
            )}
          </tbody>
        </table>
      )}
      {showAdd && <AddChildModal open={showAdd} onClose={() => setShowAdd(false)} schoolYearId={schoolYearId} />}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MealsPage() {
  const { t } = useTranslation()
  const user    = auth.getUser()
  const isAdmin = user?.role === 'admin'

  const { data: years = [] } = useSchoolYears()
  const currentYearName = currentSchoolYearName()
  const currentYear     = years.find(y => y.name === currentYearName) ?? years[0]
  const [selectedYearId, setSelectedYearId] = useState('')
  const [tab, setTab] = useState<Tab>('daily')

  const yearId = selectedYearId || currentYear?.id || ''

  const tabs: { id: Tab; label: string }[] = [
    { id: 'daily',   label: t('meals.tabDaily') },
    { id: 'billing', label: t('meals.tabBilling') },
    ...(isAdmin ? [
      { id: 'pricing'  as Tab, label: t('meals.tabPricing') },
      { id: 'children' as Tab, label: t('meals.tabChildren') },
    ] : []),
  ]

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title={t('nav.meals')}
        actions={
          <select
            value={yearId} onChange={e => setSelectedYearId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
        }
      />

      {/* Tab bar */}
      <div className="px-8 border-b border-gray-200 flex gap-1">
        {tabs.map(tb => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === tb.id
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto px-8 py-6">
        {tab === 'daily'    && yearId && <DailyTab   schoolYearId={yearId} />}
        {tab === 'billing'  && yearId && <BillingTab schoolYearId={yearId} />}
        {tab === 'pricing'  && isAdmin && yearId && <PricingTab  schoolYearId={yearId} />}
        {tab === 'children' && isAdmin && yearId && <ChildrenTab schoolYearId={yearId} />}
      </div>
    </div>
  )
}
