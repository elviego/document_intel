import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiClient, errorMessage } from '@/lib/api-client'
import { useSchoolYears, currentSchoolYearName } from '@/hooks/useSchoolYear'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { auth } from '@/lib/auth'
import { StudentImportModal } from './StudentImportModal'
import type { ChildDTO, MealRecordDTO, ChildMonthlyBillingDTO, MealTypeDTO } from '@document-intel/shared-types'

interface MealPricing {
  id: string; schoolYearId: string; mealType: 'com_sopa' | 'sem_sopa'
  schoolCost: number; parentPrice: number
}

function useChildren(schoolYearId: string) {
  return useQuery({
    queryKey: ['children', schoolYearId],
    queryFn:  () => apiClient.get<ChildDTO[]>(`/v1/meals/children/${schoolYearId}`),
    enabled:  !!schoolYearId,
  })
}

function useMonthRecords(year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return useQuery({
    queryKey: ['meal-records-month', year, month],
    queryFn:  () => apiClient.get<MealRecordDTO[]>(`/v1/meals/records?from=${from}&to=${to}`),
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

function useMealTypes() {
  return useQuery({
    queryKey: ['meal-types'],
    queryFn:  () => apiClient.get<MealTypeDTO[]>('/v1/meals/meal-types'),
  })
}

type Tab = 'tipos' | 'daily' | 'billing' | 'pricing' | 'children'

function MealTypeModal({ open, onClose, initial }: {
  open: boolean; onClose: () => void; initial: MealTypeDTO | null
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name:         initial?.name         ?? '',
    description:  initial?.description  ?? '',
    mealsPerWeek: initial?.mealsPerWeek ?? 5,
    parentPrice:  initial?.parentPrice  ?? 0,
    schoolCost:   initial?.schoolCost   ?? 0,
  })

  const mutation = useMutation({
    mutationFn: () => initial
      ? apiClient.put(`/v1/meals/meal-types/${initial.id}`, {
          ...form,
          mealsPerWeek: Number(form.mealsPerWeek),
          parentPrice:  Number(form.parentPrice),
          schoolCost:   Number(form.schoolCost),
        })
      : apiClient.post('/v1/meals/meal-types', {
          ...form,
          mealsPerWeek: Number(form.mealsPerWeek),
          parentPrice:  Number(form.parentPrice),
          schoolCost:   Number(form.schoolCost),
        }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['meal-types'] }); onClose() },
  })

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar Tipo de Refeição' : 'Novo Tipo de Refeição'}>
      <div className="space-y-3">
        <Input label="Nome *" value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <Input label="Descrição" value={form.description ?? ''}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Refeições por semana</label>
          <select value={form.mealsPerWeek}
            onChange={e => setForm(f => ({ ...f, mealsPerWeek: parseInt(e.target.value) }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} dia{n > 1 ? 's' : ''}/semana</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Preço pai/mãe (€)" type="number" step="0.01" value={String(form.parentPrice)}
            onChange={e => setForm(f => ({ ...f, parentPrice: parseFloat(e.target.value) || 0 }))} />
          <Input label="Custo escola (€)" type="number" step="0.01" value={String(form.schoolCost)}
            onChange={e => setForm(f => ({ ...f, schoolCost: parseFloat(e.target.value) || 0 }))} />
        </div>
        {mutation.isError && <p className="text-sm text-red-600">{errorMessage(mutation.error)}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name}>
          {mutation.isPending ? 'A guardar…' : 'Guardar'}
        </Button>
      </div>
    </Modal>
  )
}

function MealTypesTab() {
  const qc = useQueryClient()
  const { data: mealTypes = [], isLoading } = useMealTypes()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<MealTypeDTO | null>(null)

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.put(`/v1/meals/meal-types/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-types'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/v1/meals/meal-types/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-types'] }),
  })

  function eur(n: number) { return n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setEditing(null); setShowModal(true) }}>+ Novo tipo</Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-gray-400">A carregar…</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b border-gray-200 text-xs text-gray-500 uppercase">
              <th className="pb-2 pr-4 font-medium">Nome</th>
              <th className="pb-2 pr-4 font-medium">Refeições/semana</th>
              <th className="pb-2 pr-4 font-medium text-right">Preço pai/mãe</th>
              <th className="pb-2 pr-4 font-medium text-right">Custo escola</th>
              <th className="pb-2 pr-4 font-medium text-center">Activo</th>
              <th className="pb-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {mealTypes.map(mt => (
              <tr key={mt.id} className={`hover:bg-gray-50 ${!mt.isActive ? 'opacity-50' : ''}`}>
                <td className="py-2 pr-4 font-medium text-gray-900">
                  {mt.name}
                  {mt.description && <span className="ml-1 text-xs text-gray-400">— {mt.description}</span>}
                </td>
                <td className="py-2 pr-4 text-gray-600">{mt.mealsPerWeek}/sem</td>
                <td className="py-2 pr-4 text-right font-mono text-gray-700">{eur(mt.parentPrice)}</td>
                <td className="py-2 pr-4 text-right font-mono text-gray-600">{eur(mt.schoolCost)}</td>
                <td className="py-2 pr-4 text-center">
                  <button onClick={() => toggleActive.mutate({ id: mt.id, isActive: !mt.isActive })}
                    className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${mt.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${mt.isActive ? 'translate-x-4' : ''}`} />
                  </button>
                </td>
                <td className="py-2 text-right">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => { setEditing(mt); setShowModal(true) }}
                      className="text-xs text-gray-400 hover:text-gray-600">Editar</button>
                    <button onClick={() => { if (confirm(`Eliminar "${mt.name}"?`)) deleteMutation.mutate(mt.id) }}
                      className="text-xs text-red-400 hover:text-red-600">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
            {mealTypes.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-sm text-gray-400">Nenhum tipo de refeição</td></tr>
            )}
          </tbody>
        </table>
      )}
      {showModal && <MealTypeModal open onClose={() => setShowModal(false)} initial={editing} />}
    </div>
  )
}

function DailyTab({ schoolYearId }: { schoolYearId: string }) {
  const now    = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const qc = useQueryClient()
  const { data: records = [], isLoading } = useMonthRecords(year, month)
  const [populateMsg, setPopulateMsg] = useState<string | null>(null)

  const monthNames = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  const populateMutation = useMutation({
    mutationFn: () => apiClient.post('/v1/meals/records/populate-month', { schoolYearId, year, month }),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['meal-records-month', year, month] })
      setPopulateMsg(`${data.count} registos adicionados.`)
      setTimeout(() => setPopulateMsg(null), 3000)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/v1/meals/records/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-records-month', year, month] }),
  })

  const byChild: Record<string, MealRecordDTO[]> = {}
  records.forEach(r => { (byChild[r.childName] ??= []).push(r) })
  const sortedChildren = Object.keys(byChild).sort()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select value={month} onChange={e => setMonth(Number(e.target.value))}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white">
          {monthNames.slice(1).map((n, i) => <option key={i + 1} value={i + 1}>{n}</option>)}
        </select>
        <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm w-24" />
        <Button size="sm" variant="secondary"
          onClick={() => populateMutation.mutate()}
          disabled={populateMutation.isPending}>
          {populateMutation.isPending ? 'A preencher…' : 'Auto-preencher mês'}
        </Button>
        {populateMsg && <span className="text-sm text-green-600">{populateMsg}</span>}
        {populateMutation.isError && (
          <span className="text-sm text-red-600">{errorMessage(populateMutation.error)}</span>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">A carregar…</p>
      ) : records.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">
          Sem registos para {monthNames[month]} {year}.
          Use “Auto-preencher mês” para gerar os registos automaticamente.
        </p>
      ) : (
        <div className="space-y-4">
          {sortedChildren.map(childName => {
            const childRecords = byChild[childName].sort((a, b) => a.date.localeCompare(b.date))
            return (
              <div key={childName} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <h3 className="font-semibold text-sm text-gray-900">{childName}</h3>
                  <span className="text-xs text-gray-500">{childRecords.length} refeições</span>
                </div>
                <div className="flex flex-wrap gap-2 p-3">
                  {childRecords.map(r => (
                    <div key={r.id} className="flex items-center gap-1 bg-brand-50 text-brand-800 rounded-lg px-2 py-1 text-xs">
                      <span>{new Date(r.date + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric' })}</span>
                      {r.mealTypeName && <span className="text-brand-500">· {r.mealTypeName}</span>}
                      <button
                        onClick={() => deleteMutation.mutate(r.id)}
                        className="ml-1 text-brand-400 hover:text-red-500 font-bold leading-none"
                        title="Remover registo"
                      >×</button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          <p className="text-xs text-gray-400 pt-1">
            Total: {records.length} refeições — clique no × para remover um dia.
          </p>
        </div>
      )}
    </div>
  )
}

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

function PricingTab({ schoolYearId }: { schoolYearId: string }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: pricing = [] } = usePricing(schoolYearId)

  const soupEntry   = pricing.find(p => p.mealType === 'com_sopa')
  const noSoupEntry = pricing.find(p => p.mealType === 'sem_sopa')

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

function AddChildModal({ open, onClose, schoolYearId }: { open: boolean; onClose: () => void; schoolYearId: string }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: mealTypes = [] } = useMealTypes()
  const [form, setForm] = useState({
    fullName: '', tuitionType: 'mensalidade',
    mealTypeId: '', mealStartDate: new Date().toISOString().slice(0, 10),
  })

  const mutation = useMutation({
    mutationFn: async () => {
      const child = await apiClient.post<ChildDTO>('/v1/meals/children', {
        fullName: form.fullName, tuitionType: form.tuitionType, schoolYearId,
      })
      if (form.mealTypeId) {
        await apiClient.post('/v1/meals/child-meal-plans', {
          childId: child.id, mealTypeId: form.mealTypeId, startDate: form.mealStartDate,
        })
      }
      return child
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['children'] })
      onClose()
    },
  })

  const activeMealTypes = mealTypes.filter(mt => mt.isActive)

  return (
    <Modal open={open} onClose={onClose} title={t('meals.addChild')}>
      <div className="space-y-3">
        <Input label={t('meals.childName')} value={form.fullName}
          onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
        <Input label={t('meals.tuitionType')} value={form.tuitionType}
          onChange={e => setForm(f => ({ ...f, tuitionType: e.target.value }))} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de refeição *</label>
          <select value={form.mealTypeId}
            onChange={e => setForm(f => ({ ...f, mealTypeId: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">— Selecionar —</option>
            {activeMealTypes.map(mt => (
              <option key={mt.id} value={mt.id}>{mt.name} ({mt.mealsPerWeek}/sem)</option>
            ))}
          </select>
        </div>
        <Input label="Data de início do plano" type="date" value={form.mealStartDate}
          onChange={e => setForm(f => ({ ...f, mealStartDate: e.target.value }))} />
        {mutation.isError && <p className="text-sm text-red-600">{errorMessage(mutation.error)}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        <Button onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !form.fullName || !form.mealTypeId}>
          {mutation.isPending ? t('common.loading') : t('common.save')}
        </Button>
      </div>
    </Modal>
  )
}

function ChildrenTab({ schoolYearId }: { schoolYearId: string }) {
  const { t } = useTranslation()
  const { data: children = [], isLoading } = useChildren(schoolYearId)
  const [showAdd, setShowAdd]       = useState(false)
  const [showImport, setShowImport] = useState(false)
  const qc = useQueryClient()

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(`/v1/meals/children/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['children'] }),
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>↑ Import CSV</Button>
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
                    className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${child.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${child.isActive ? 'translate-x-4' : ''}`} />
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
      {showAdd    && <AddChildModal open onClose={() => setShowAdd(false)} schoolYearId={schoolYearId} />}
      {showImport && <StudentImportModal open onClose={() => setShowImport(false)} schoolYearId={schoolYearId} />}
    </div>
  )
}

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
    { id: 'daily',    label: 'Registo Diário' },
    { id: 'billing',  label: t('meals.tabBilling') },
    ...(isAdmin ? [
      { id: 'tipos'    as Tab, label: 'Tipos de Refeição' },
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

      <div className="px-8 border-b border-gray-200 flex gap-1">
        {tabs.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
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
        {tab === 'tipos'    && isAdmin && <MealTypesTab />}
        {tab === 'daily'    && yearId  && <DailyTab    schoolYearId={yearId} />}
        {tab === 'billing'  && yearId  && <BillingTab  schoolYearId={yearId} />}
        {tab === 'pricing'  && isAdmin && yearId && <PricingTab  schoolYearId={yearId} />}
        {tab === 'children' && isAdmin && yearId && <ChildrenTab schoolYearId={yearId} />}
      </div>
    </div>
  )
}
