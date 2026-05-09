import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, errorMessage } from '@/lib/api-client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { auth } from '@/lib/auth'
import type { EnrollmentPlanDTO, CreateEnrollmentPlanDTO, ScheduleType, BillingCycle } from '@fin-tribe/shared-types'

const SCHEDULE_LABELS: Record<ScheduleType, string> = {
  full_time:          'Tempo Integral (5 dias/semana)',
  part_time_days:     'Part-time — N dias/semana',
  part_time_mornings: 'Só de Manhãs',
  holiday:            'Plano Férias',
  custom:             'Personalizado',
}

const BILLING_LABELS: Record<BillingCycle, string> = {
  monthly:   'Mensal',
  trimestral:'Trimestral',
  annual:    'Anual',
}

function usePlans() {
  return useQuery({
    queryKey: ['enrollment-plans'],
    queryFn:  () => apiClient.get<EnrollmentPlanDTO[]>('/v1/enrollment-plans?includeInactive=true'),
  })
}

function PlanModal({ open, onClose, initial }: {
  open: boolean; onClose: () => void; initial: EnrollmentPlanDTO | null
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Omit<CreateEnrollmentPlanDTO, never>>({
    name:            initial?.name         ?? '',
    description:     initial?.description  ?? '',
    scheduleType:    initial?.scheduleType ?? 'custom',
    daysPerWeek:     initial?.daysPerWeek  ?? undefined,
    morningsOnly:    initial?.morningsOnly ?? false,
    billingCycle:    initial?.billingCycle ?? 'monthly',
    baseAmount:      initial?.baseAmount   ?? 0,
    discountPercent: initial?.discountPercent ?? undefined,
    discountFixed:   initial?.discountFixed   ?? undefined,
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const mutation = useMutation({
    mutationFn: () => initial
      ? apiClient.put(`/v1/enrollment-plans/${initial.id}`, {
          ...form,
          baseAmount:      parseFloat(String(form.baseAmount)) || 0,
          discountPercent: form.discountPercent ? parseFloat(String(form.discountPercent)) : undefined,
          discountFixed:   form.discountFixed   ? parseFloat(String(form.discountFixed))   : undefined,
          daysPerWeek:     form.daysPerWeek     ? parseInt(String(form.daysPerWeek))        : undefined,
        })
      : apiClient.post('/v1/enrollment-plans', {
          ...form,
          baseAmount:      parseFloat(String(form.baseAmount)) || 0,
          discountPercent: form.discountPercent ? parseFloat(String(form.discountPercent)) : undefined,
          discountFixed:   form.discountFixed   ? parseFloat(String(form.discountFixed))   : undefined,
          daysPerWeek:     form.daysPerWeek     ? parseInt(String(form.daysPerWeek))        : undefined,
        }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['enrollment-plans'] }); onClose() },
  })

  const showDaysPerWeek = form.scheduleType === 'part_time_days' || form.scheduleType === 'part_time_mornings'

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar Plano' : 'Novo Plano'}>
      <div className="space-y-3">
        <Input label="Nome do plano *" value={form.name} onChange={set('name')} />
        <Input label="Descrição" value={form.description ?? ''} onChange={set('description')} />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de horário</label>
          <select value={form.scheduleType} onChange={set('scheduleType')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            {(Object.keys(SCHEDULE_LABELS) as ScheduleType[]).map(k => (
              <option key={k} value={k}>{SCHEDULE_LABELS[k]}</option>
            ))}
          </select>
        </div>

        {showDaysPerWeek && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dias por semana</label>
            <select value={form.daysPerWeek != null ? String(form.daysPerWeek) : ''}
              onChange={e => setForm(f => ({ ...f, daysPerWeek: e.target.value ? parseInt(e.target.value) : undefined }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">Selecionar…</option>
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} dia{n > 1 ? 's' : ''}</option>)}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input type="checkbox" id="mornings" checked={form.morningsOnly}
            onChange={e => setForm(f => ({ ...f, morningsOnly: e.target.checked }))}
            className="rounded text-brand-600" />
          <label htmlFor="mornings" className="text-sm text-gray-700">Apenas período da manhã</label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ciclo de faturação</label>
          <select value={form.billingCycle} onChange={set('billingCycle')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            {(Object.keys(BILLING_LABELS) as BillingCycle[]).map(k => (
              <option key={k} value={k}>{BILLING_LABELS[k]}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Input label="Valor base (€) *" type="number" value={String(form.baseAmount)}
            onChange={e => setForm(f => ({ ...f, baseAmount: parseFloat(e.target.value) || 0 }))} />
          <Input label="Desconto (%)" type="number" value={form.discountPercent != null ? String(form.discountPercent) : ''}
            onChange={e => setForm(f => ({ ...f, discountPercent: e.target.value ? parseFloat(e.target.value) : undefined }))} />
          <Input label="Desconto fixo (€)" type="number" value={form.discountFixed != null ? String(form.discountFixed) : ''}
            onChange={e => setForm(f => ({ ...f, discountFixed: e.target.value ? parseFloat(e.target.value) : undefined }))} />
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

export default function EnrollmentPlansPage() {
  const isAdmin = auth.getUser()?.role === 'admin'
  const qc = useQueryClient()
  const { data: plans = [], isLoading } = usePlans()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<EnrollmentPlanDTO | null>(null)

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.put(`/v1/enrollment-plans/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enrollment-plans'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/v1/enrollment-plans/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enrollment-plans'] }),
  })

  function eur(n: number) { return n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) }

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Planos de Matrícula"
        subtitle={`${plans.length} planos`}
        actions={isAdmin ? <Button size="sm" onClick={() => { setEditing(null); setShowModal(true) }}>+ Novo plano</Button> : undefined}
      />

      <div className="flex-1 overflow-auto px-8 pb-8">
        {isLoading ? (
          <p className="text-sm text-gray-400 py-4">A carregar…</p>
        ) : !isLoading && plans.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-gray-500">Nenhum plano de matrícula criado ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {plans.map(plan => {
              const finalAmount = plan.discountFixed
                ? plan.baseAmount - plan.discountFixed
                : plan.discountPercent
                  ? plan.baseAmount * (1 - plan.discountPercent / 100)
                  : plan.baseAmount

              return (
                <div key={plan.id} className={`bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-2 ${!plan.isActive ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                      {plan.isPreset && (
                        <span className="text-xs bg-brand-50 text-brand-700 rounded-full px-2 py-0.5">Pré-definido</span>
                      )}
                    </div>
                    <p className="text-lg font-bold text-brand-700 shrink-0">{eur(finalAmount)}</p>
                  </div>

                  {plan.description && <p className="text-xs text-gray-500">{plan.description}</p>}

                  <div className="text-xs text-gray-500 space-y-0.5">
                    <p>📅 {SCHEDULE_LABELS[plan.scheduleType]}</p>
                    {plan.daysPerWeek && <p>📆 {plan.daysPerWeek} dias/semana</p>}
                    <p>🗓 {BILLING_LABELS[plan.billingCycle]}</p>
                    {(plan.discountPercent || plan.discountFixed) && (
                      <p className="text-green-600">
                        🏷 Desconto: {plan.discountPercent ? `${plan.discountPercent}%` : ''}{plan.discountFixed ? ` ${eur(plan.discountFixed)}` : ''}
                      </p>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                      <button onClick={() => toggleActive.mutate({ id: plan.id, isActive: !plan.isActive })}
                        className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${plan.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${plan.isActive ? 'translate-x-4' : ''}`} />
                      </button>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditing(plan); setShowModal(true) }}
                          className="text-xs text-gray-400 hover:text-gray-600">Editar</button>
                        {!plan.isPreset && (
                          <button onClick={() => { if (confirm(`Eliminar "${plan.name}"?`)) deleteMutation.mutate(plan.id) }}
                            className="text-xs text-red-400 hover:text-red-600">Eliminar</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <PlanModal open onClose={() => setShowModal(false)} initial={editing} />
      )}
    </div>
  )
}
