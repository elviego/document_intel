import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiClient, errorMessage } from '@/lib/api-client'
import { useSchoolYears, currentSchoolYearName } from '@/hooks/useSchoolYear'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import type { SalaryEntryDTO } from '@document-intel/shared-types'

const SALARY_TYPES = [
  { value: 'contrato',   label: 'Contrato' },
  { value: 'rec_verdes', label: 'Recibos Verdes' },
  { value: 'horas',      label: 'Horas Extra' },
  { value: 'terceiros',  label: 'Terceiros' },
]

const RECURRENCE_TYPES = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'weekly',  label: 'Semanal' },
  { value: 'annual',  label: 'Anual' },
]

function useSalaries(schoolYearId: string) {
  return useQuery({
    queryKey: ['salaries', schoolYearId],
    queryFn:  () => apiClient.get<SalaryEntryDTO[]>(`/v1/salaries/${schoolYearId}`),
    enabled:  !!schoolYearId,
  })
}

function formatEuro(n: number) {
  return n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
}

function AddSalaryModal({
  open, onClose, schoolYearId,
}: { open: boolean; onClose: () => void; schoolYearId: string }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState({
    personName:   '',
    salaryType:   'contrato',
    serviceName:  '',
    baseAmount:   '',
    actualAmount: '',
    recurrence:   'monthly',
  })

  const mutation = useMutation({
    mutationFn: () => apiClient.post('/v1/salaries', {
      ...form,
      schoolYearId,
      baseAmount:   parseFloat(form.baseAmount)  || 0,
      actualAmount: parseFloat(form.actualAmount) || parseFloat(form.baseAmount) || 0,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['salaries'] })
      onClose()
    },
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <Modal open={open} onClose={onClose} title={t('salaries.add')}>
      <div className="space-y-3">
        <Input label={t('salaries.personName')} value={form.personName} onChange={set('personName')} />
        <Select label={t('salaries.type')} value={form.salaryType} onChange={set('salaryType')}
          options={SALARY_TYPES} />
        <Input label={t('salaries.serviceName')} value={form.serviceName} onChange={set('serviceName')}
          placeholder={t('salaries.serviceNameHint')} />
        <Select label="Recorrência" value={form.recurrence} onChange={set('recurrence')}
          options={RECURRENCE_TYPES} />
        <Input label={t('salaries.baseAmount')} type="number" step="0.01" value={form.baseAmount}
          onChange={set('baseAmount')} />
        <Input label={t('salaries.actualAmount')} type="number" step="0.01" value={form.actualAmount}
          onChange={set('actualAmount')} placeholder={t('salaries.actualAmountHint')} />
        {mutation.isError && (
          <p className="text-sm text-red-600">{errorMessage(mutation.error)}</p>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !form.personName || !form.baseAmount}
        >
          {mutation.isPending ? t('common.loading') : t('common.save')}
        </Button>
      </div>
    </Modal>
  )
}

export default function SalariesPage() {
  const { t } = useTranslation()
  const { data: years = [] } = useSchoolYears()
  const currentYearName = currentSchoolYearName()
  const currentYear     = years.find(y => y.name === currentYearName) ?? years[0]

  const [selectedYearId, setSelectedYearId] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const yearId = selectedYearId || currentYear?.id || ''
  const { data: entries = [], isLoading } = useSalaries(yearId)
  const qc = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/v1/salaries/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['salaries'] }),
  })

  const byPerson: Record<string, SalaryEntryDTO[]> = {}
  entries.forEach(e => { (byPerson[e.personName] ??= []).push(e) })

  const totalActual = entries.reduce((s, e) => s + e.actualAmount, 0)

  if (isLoading) return <div className="p-8 text-gray-400 text-sm">{t('common.loading')}</div>

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title={t('nav.salaries')}
        subtitle={`Total: ${formatEuro(totalActual)}`}
        actions={
          <div className="flex items-center gap-3">
            <select
              value={yearId} onChange={e => setSelectedYearId(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
            <Button size="sm" onClick={() => setShowAdd(true)}>+ {t('salaries.add')}</Button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto px-8 pb-8">
        {Object.keys(byPerson).length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">{t('salaries.empty')}</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(byPerson).map(([person, personEntries]) => (
              <PersonCard key={person} person={person} entries={personEntries}
                onDelete={id => { if (confirm(t('salaries.confirmDelete'))) deleteMutation.mutate(id) }} />
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <AddSalaryModal open={showAdd} onClose={() => setShowAdd(false)} schoolYearId={yearId} />
      )}
    </div>
  )
}

function PersonCard({ person, entries, onDelete }: {
  person: string; entries: SalaryEntryDTO[]; onDelete: (id: string) => void
}) {
  const total = entries.reduce((s, e) => s + e.actualAmount, 0)
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 text-sm">{person}</h3>
        <span className="text-sm font-mono font-semibold text-gray-700">{formatEuro(total)}</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
            <th className="px-4 py-2 font-medium">Tipo</th>
            <th className="px-4 py-2 font-medium">Serviço</th>
            <th className="px-4 py-2 font-medium">Recorrência</th>
            <th className="px-4 py-2 font-medium text-right">Base</th>
            <th className="px-4 py-2 font-medium text-right">Real</th>
            <th className="px-4 py-2 w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {entries.map(e => (
            <tr key={e.id} className="hover:bg-gray-50 group">
              <td className="px-4 py-2">
                <Badge variant="gray">{SALARY_TYPES.find(s => s.value === e.salaryType)?.label ?? e.salaryType}</Badge>
              </td>
              <td className="px-4 py-2 text-gray-500 max-w-xs truncate">{e.serviceName ?? '—'}</td>
              <td className="px-4 py-2 text-gray-500">
                {RECURRENCE_TYPES.find(r => r.value === e.recurrence)?.label ?? e.recurrence}
              </td>
              <td className="px-4 py-2 text-right font-mono text-gray-600">{formatEuro(e.baseAmount)}</td>
              <td className="px-4 py-2 text-right font-mono font-semibold text-gray-900">{formatEuro(e.actualAmount)}</td>
              <td className="px-4 py-2">
                <button
                  onClick={() => onDelete(e.id)}
                  className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
