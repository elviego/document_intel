import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, errorMessage } from '@/lib/api-client'
import { auth } from '@/lib/auth'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { EmployeeDTO, CreateEmployeeDTO, WageDTO, WageContractType, WageMaritalStatus, WagePreviewDTO } from '@document-intel/shared-types'

const CONTRACT_TYPES = [
  { value: 'contrato',   label: 'Contrato' },
  { value: 'rec_verdes', label: 'Rec. Verdes' },
  { value: 'horas',      label: 'Horas' },
  { value: 'terceiros',  label: 'Terceiros' },
]

const WAGE_CONTRACT_TYPES: { value: WageContractType; label: string; detail: string }[] = [
  { value: 'sem_termo',  label: 'Contrato sem termo',        detail: 'Permanente — IRS tabela + SS 11% / 23.75%' },
  { value: 'a_termo',    label: 'Contrato a termo',          detail: 'Prazo certo — IRS tabela + SS 11% / 23.75%' },
  { value: 'rec_verdes', label: 'Prestação de serviços',     detail: 'Recibos verdes — IRS 25% flat, sem SS patronal' },
  { value: 'horas',      label: 'Horas / serviços pontuais', detail: 'Trabalho horário — IRS tabela + SS 11% / 23.75%' },
]

const MARITAL_STATUS: { value: WageMaritalStatus; label: string }[] = [
  { value: 'nao_casado',           label: 'Não casado(a)' },
  { value: 'casado_2_titulares',   label: 'Casado(a) — 2 titulares' },
  { value: 'casado_1_titular',     label: 'Casado(a) — 1 titular' },
]

const EMPTY: CreateEmployeeDTO = {
  fullName: '', position: '', contractType: 'contrato',
  email: '', phone: '', nif: '', iban: '', baseSalary: 0,
  startDate: '', endDate: '', notes: '',
}

function eur(n: number) {
  return n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
}

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`
}

// ─── Employee form modal ──────────────────────────────────────────────────────
function EmployeeModal({ open, onClose, initial }: {
  open: boolean; onClose: () => void; initial: EmployeeDTO | null
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<CreateEmployeeDTO>(
    initial ? {
      fullName: initial.fullName, position: initial.position,
      contractType: initial.contractType, email: initial.email ?? '',
      phone: initial.phone ?? '', nif: initial.nif ?? '',
      iban: initial.iban ?? '', baseSalary: initial.baseSalary,
      startDate: initial.startDate ?? '', endDate: initial.endDate ?? '',
      notes: initial.notes ?? '',
    } : EMPTY
  )

  const mutation = useMutation({
    mutationFn: () => initial
      ? apiClient.put(`/v1/employees/${initial.id}`, form)
      : apiClient.post('/v1/employees', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); onClose() },
  })

  const set = (k: keyof CreateEmployeeDTO) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar Funcionário' : 'Novo Funcionário'}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nome completo *" value={form.fullName} onChange={set('fullName')} className="col-span-2" />
          <Input label="Cargo / função" value={form.position} onChange={set('position')} />
          <Select label="Tipo de contrato" value={form.contractType} onChange={set('contractType')}
            options={CONTRACT_TYPES.map(c => ({ value: c.value, label: c.label }))} />
          <Input label="Salário base (€)" type="number" step="0.01" value={String(form.baseSalary)}
            onChange={e => setForm(f => ({ ...f, baseSalary: parseFloat(e.target.value) || 0 }))} />
          <Input label="Email" type="email" value={form.email ?? ''} onChange={set('email')} />
          <Input label="Telefone" value={form.phone ?? ''} onChange={set('phone')} />
          <Input label="NIF" value={form.nif ?? ''} onChange={set('nif')} />
          <Input label="IBAN" value={form.iban ?? ''} onChange={set('iban')} />
          <Input label="Data de início" type="date" value={form.startDate ?? ''} onChange={set('startDate')} />
          <Input label="Data de fim" type="date" value={form.endDate ?? ''} onChange={set('endDate')} />
        </div>
        <Input label="Notas" value={form.notes ?? ''} onChange={set('notes')} />
        {mutation.isError && <p className="text-sm text-red-600">{errorMessage(mutation.error)}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.fullName}>
          {mutation.isPending ? 'A guardar…' : 'Guardar'}
        </Button>
      </div>
    </Modal>
  )
}

// ─── Wage modal ───────────────────────────────────────────────────────────────
function WageModal({ open, onClose, employee }: {
  open: boolean; onClose: () => void; employee: EmployeeDTO
}) {
  const qc = useQueryClient()
  const today = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({
    grossAmount:   employee.baseSalary || 0,
    contractType:  'sem_termo' as WageContractType,
    maritalStatus: 'nao_casado' as WageMaritalStatus,
    dependents:    0,
    effectiveFrom: today,
    notes:         '',
  })
  const [preview, setPreview] = useState<WagePreviewDTO | null>(null)
  const [previewing, setPreviewing] = useState(false)

  const { data: history = [] } = useQuery({
    queryKey: ['wages', employee.id],
    queryFn:  () => apiClient.get<WageDTO[]>(`/v1/wages/employee/${employee.id}`),
    enabled:  open,
  })

  async function handlePreview() {
    setPreviewing(true)
    try {
      const result = await apiClient.post<WagePreviewDTO>('/v1/wages/preview', {
        grossAmount:   form.grossAmount,
        contractType:  form.contractType,
        maritalStatus: form.maritalStatus,
        dependents:    form.dependents,
      })
      setPreview(result)
    } finally {
      setPreviewing(false)
    }
  }

  const saveMutation = useMutation({
    mutationFn: () => apiClient.post('/v1/wages', {
      employeeId:    employee.id,
      effectiveFrom: form.effectiveFrom,
      grossAmount:   form.grossAmount,
      contractType:  form.contractType,
      maritalStatus: form.maritalStatus,
      dependents:    form.dependents,
      notes:         form.notes || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wages', employee.id] })
      setPreview(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/v1/wages/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wages', employee.id] }),
  })

  return (
    <Modal open={open} onClose={onClose} title={`Salário — ${employee.fullName}`}>
      <div className="space-y-4">
        {/* Calculator */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase">Calculadora de vencimento</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Salário bruto (€) *" type="number" step="0.01"
              value={String(form.grossAmount)}
              onChange={e => { setForm(f => ({ ...f, grossAmount: parseFloat(e.target.value) || 0 })); setPreview(null) }} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de contrato</label>
              <select value={form.contractType}
                onChange={e => { setForm(f => ({ ...f, contractType: e.target.value as WageContractType })); setPreview(null) }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                {WAGE_CONTRACT_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado civil</label>
              <select value={form.maritalStatus}
                onChange={e => { setForm(f => ({ ...f, maritalStatus: e.target.value as WageMaritalStatus })); setPreview(null) }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                {MARITAL_STATUS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <Input label="Dependentes" type="number" min="0" max="20"
              value={String(form.dependents)}
              onChange={e => { setForm(f => ({ ...f, dependents: parseInt(e.target.value) || 0 })); setPreview(null) }} />
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={handlePreview} disabled={previewing || !form.grossAmount}>
              {previewing ? 'A calcular…' : 'Calcular'}
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.grossAmount}>
              {saveMutation.isPending ? 'A guardar…' : 'Guardar vencimento'}
            </Button>
          </div>
          {saveMutation.isError   && <p className="text-sm text-red-600">{errorMessage(saveMutation.error)}</p>}
          {saveMutation.isSuccess && <p className="text-sm text-green-600">Vencimento guardado.</p>}

          {preview && (
            <div className="mt-2 space-y-1">
              <div className="grid grid-cols-2 gap-x-6 text-sm">
                <Row label="Salário bruto"         value={eur(preview.grossAmount)} bold />
                <Row label={`IRS (${pct(preview.irsRate)})`} value={`− ${eur(preview.irsAmount)}`} red />
                <Row label={`SS trabalhador (${pct(preview.ssEmployeeRate)})`} value={`− ${eur(preview.ssEmployeeAmount)}`} red />
                <Row label="Salário líquido"        value={eur(preview.netAmount)} bold green />
              </div>
              <div className="border-t border-gray-200 pt-2 grid grid-cols-2 gap-x-6 text-sm">
                <Row label={`SS patronal (${pct(preview.ssEmployerRate)})`} value={eur(preview.ssEmployerAmount)} />
                <Row label="Custo total patronal"   value={eur(preview.totalEmployerCost)} bold />
              </div>
              <p className="text-xs text-gray-400 pt-1">
                Tabela IRS Continente 2026 (verificar anualmente em portaldasfinancas.gov.pt)
              </p>
            </div>
          )}

          {/* Effective date + notes always visible */}
          <div className="pt-2 border-t border-gray-200 flex items-end gap-3">
            <Input label="Válido a partir de" type="date" value={form.effectiveFrom}
              onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))} />
            <Input label="Notas" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Histórico</p>
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
              {history.map(w => (
                <div key={w.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-900">{eur(w.grossAmount)}</span>
                    <span className="text-gray-400 ml-2 text-xs">bruto</span>
                    <span className="ml-4 text-green-700 font-medium">{eur(w.netAmount)}</span>
                    <span className="text-gray-400 ml-1 text-xs">líquido</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>desde {w.effectiveFrom}</span>
                    <button onClick={() => { if (confirm('Eliminar este registo?')) deleteMutation.mutate(w.id) }}
                      className="text-red-400 hover:text-red-600">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button variant="secondary" onClick={onClose}>Fechar</Button>
      </div>
    </Modal>
  )
}

function Row({ label, value, bold, red, green }: { label: string; value: string; bold?: boolean; red?: boolean; green?: boolean }) {
  return (
    <>
      <span className={`text-gray-500 py-0.5 ${bold ? 'font-semibold text-gray-700' : ''}`}>{label}</span>
      <span className={`text-right py-0.5 font-mono ${bold ? 'font-semibold' : ''} ${red ? 'text-red-600' : ''} ${green ? 'text-green-700' : 'text-gray-800'}`}>{value}</span>
    </>
  )
}

// ─── Employee row with lazy-loaded latest wage ────────────────────────────────
function EmployeeRow({ emp, isAdmin, onWage, onEdit, onToggle, onDelete }: {
  emp: EmployeeDTO
  isAdmin: boolean
  onWage: () => void
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const { data: latestWage } = useQuery({
    queryKey: ['wages', emp.id, 'latest'],
    queryFn:  () => apiClient.get<WageDTO | null>(`/v1/wages/employee/${emp.id}/latest`),
  })

  return (
    <tr className="hover:bg-gray-50 group">
      <td className="py-2 pr-4 font-medium text-gray-900">{emp.fullName}</td>
      <td className="py-2 pr-4 text-gray-600">{emp.position || '—'}</td>
      <td className="py-2 pr-4">
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
          {CONTRACT_TYPES.find(c => c.value === emp.contractType)?.label ?? emp.contractType}
        </span>
      </td>
      <td className="py-2 pr-4 text-right font-mono text-gray-700">
        {eur(latestWage?.grossAmount ?? emp.baseSalary)}
      </td>
      <td className="py-2 pr-4 text-right font-mono">
        {latestWage
          ? <span className="text-green-700 font-medium">{eur(latestWage.netAmount)}</span>
          : <button onClick={onWage} className="text-xs text-gray-400 hover:text-brand-600 underline">calcular</button>
        }
      </td>
      <td className="py-2 pr-4 text-gray-500 text-xs">
        {emp.email && <div>{emp.email}</div>}
        {emp.phone && <div>{emp.phone}</div>}
      </td>
      <td className="py-2">
        <div className="flex gap-2">
          <button onClick={onWage}
            className="text-xs text-green-600 hover:text-green-800 font-medium">Salário</button>
          {isAdmin && (
            <>
              <button onClick={onEdit}
                className="text-xs text-brand-600 hover:text-brand-800">Editar</button>
              <button onClick={onToggle}
                className="text-xs text-gray-400 hover:text-gray-600 hidden group-hover:inline">
                {emp.isActive ? 'Desativar' : 'Ativar'}
              </button>
              <button onClick={onDelete}
                className="text-xs text-red-400 hover:text-red-600 hidden group-hover:inline">Eliminar</button>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const isAdmin = auth.getUser()?.role === 'admin'
  const qc = useQueryClient()
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiClient.get<EmployeeDTO[]>('/v1/employees'),
  })

  const [showModal, setShowModal]       = useState(false)
  const [editing, setEditing]           = useState<EmployeeDTO | null>(null)
  const [wageTarget, setWageTarget]     = useState<EmployeeDTO | null>(null)
  const [filterActive, setFilterActive] = useState(true)

  const toggleActive = useMutation({
    mutationFn: (emp: EmployeeDTO) =>
      apiClient.put(`/v1/employees/${emp.id}`, { isActive: !emp.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/v1/employees/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  })

  const visible = employees.filter(e => filterActive ? e.isActive : !e.isActive)

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Funcionários"
        subtitle={`${visible.length} ${filterActive ? 'ativos' : 'inativos'}`}
        actions={
          <>
            <select value={filterActive ? 'active' : 'inactive'}
              onChange={e => setFilterActive(e.target.value === 'active')}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none">
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
            {isAdmin && <Button size="sm" onClick={() => { setEditing(null); setShowModal(true) }}>+ Novo funcionário</Button>}
          </>
        }
      />

      <div className="flex-1 overflow-auto px-8 pb-8">
        {isLoading ? (
          <p className="text-sm text-gray-400 py-4">A carregar…</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
                <th className="pb-2 pr-4 font-medium">Nome</th>
                <th className="pb-2 pr-4 font-medium">Cargo</th>
                <th className="pb-2 pr-4 font-medium">Contrato</th>
                <th className="pb-2 pr-4 font-medium text-right">Bruto</th>
                <th className="pb-2 pr-4 font-medium text-right">Líquido</th>
                <th className="pb-2 pr-4 font-medium">Contacto</th>
                <th className="pb-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map(emp => (
                <EmployeeRow
                  key={emp.id}
                  emp={emp}
                  isAdmin={isAdmin}
                  onWage={() => setWageTarget(emp)}
                  onEdit={() => { setEditing(emp); setShowModal(true) }}
                  onToggle={() => toggleActive.mutate(emp)}
                  onDelete={() => { if (confirm(`Eliminar ${emp.fullName}?`)) deleteMutation.mutate(emp.id) }}
                />
              ))}
            </tbody>
          </table>
        )}
        {!isLoading && visible.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-12">Nenhum funcionário encontrado.</p>
        )}
      </div>

      {showModal && (
        <EmployeeModal open onClose={() => setShowModal(false)} initial={editing} />
      )}
      {wageTarget && (
        <WageModal open onClose={() => setWageTarget(null)} employee={wageTarget} />
      )}
    </div>
  )
}
