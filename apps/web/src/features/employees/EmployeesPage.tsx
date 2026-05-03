import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, errorMessage } from '@/lib/api-client'
import { auth } from '@/lib/auth'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { EmployeeDTO, CreateEmployeeDTO } from '@fin-tribe/shared-types'

const CONTRACT_TYPES = [
  { value: 'contrato',   label: 'Contrato' },
  { value: 'rec_verdes', label: 'Rec. Verdes' },
  { value: 'horas',      label: 'Horas' },
  { value: 'terceiros',  label: 'Terceiros' },
]

const EMPTY: CreateEmployeeDTO = {
  fullName: '', position: '', contractType: 'contrato',
  email: '', phone: '', nif: '', iban: '', baseSalary: 0,
  startDate: '', endDate: '', notes: '',
}

function EmployeeModal({
  open, onClose, initial,
}: {
  open: boolean
  onClose: () => void
  initial: EmployeeDTO | null
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

  const title = initial ? 'Edit Employee' : 'New Employee'

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Full name *" value={form.fullName} onChange={set('fullName')} className="col-span-2" />
          <Input label="Position" value={form.position} onChange={set('position')} />
          <Select label="Contract type" value={form.contractType} onChange={set('contractType')}
            options={CONTRACT_TYPES.map(c => ({ value: c.value, label: c.label }))} />
          <Input label="Base salary (€)" type="number" step="0.01" value={String(form.baseSalary)}
            onChange={e => setForm(f => ({ ...f, baseSalary: parseFloat(e.target.value) || 0 }))} />
          <Input label="Email" type="email" value={form.email ?? ''} onChange={set('email')} />
          <Input label="Phone" value={form.phone ?? ''} onChange={set('phone')} />
          <Input label="NIF" value={form.nif ?? ''} onChange={set('nif')} />
          <Input label="IBAN" value={form.iban ?? ''} onChange={set('iban')} />
          <Input label="Start date" type="date" value={form.startDate ?? ''} onChange={set('startDate')} />
          <Input label="End date" type="date" value={form.endDate ?? ''} onChange={set('endDate')} />
        </div>
        <Input label="Notes" value={form.notes ?? ''} onChange={set('notes')} />
        {mutation.isError && <p className="text-sm text-red-600">{errorMessage(mutation.error)}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.fullName}>
          {mutation.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Modal>
  )
}

export default function EmployeesPage() {
  const isAdmin = auth.getUser()?.role === 'admin'
  const qc = useQueryClient()
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiClient.get<EmployeeDTO[]>('/v1/employees'),
  })

  const [showModal, setShowModal]       = useState(false)
  const [editing, setEditing]           = useState<EmployeeDTO | null>(null)
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

  function openEdit(emp: EmployeeDTO) { setEditing(emp); setShowModal(true) }
  function openNew() { setEditing(null); setShowModal(true) }

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Employees"
        subtitle={`${visible.length} ${filterActive ? 'active' : 'inactive'}`}
        actions={
          <>
            <select
              value={filterActive ? 'active' : 'inactive'}
              onChange={e => setFilterActive(e.target.value === 'active')}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {isAdmin && <Button size="sm" onClick={openNew}>+ New Employee</Button>}
          </>
        }
      />

      <div className="flex-1 overflow-auto px-8 pb-8">
        {isLoading ? (
          <p className="text-sm text-gray-400 py-4">Loading…</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Position</th>
                <th className="pb-2 pr-4 font-medium">Contract</th>
                <th className="pb-2 pr-4 font-medium text-right">Base salary</th>
                <th className="pb-2 pr-4 font-medium">Contact</th>
                <th className="pb-2 pr-4 font-medium">Start</th>
                {isAdmin && <th className="pb-2 font-medium" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50 group">
                  <td className="py-2 pr-4 font-medium text-gray-900">{emp.fullName}</td>
                  <td className="py-2 pr-4 text-gray-600">{emp.position || '—'}</td>
                  <td className="py-2 pr-4">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {CONTRACT_TYPES.find(c => c.value === emp.contractType)?.label ?? emp.contractType}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-gray-700">
                    {emp.baseSalary.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                  </td>
                  <td className="py-2 pr-4 text-gray-500 text-xs">
                    {emp.email && <div>{emp.email}</div>}
                    {emp.phone && <div>{emp.phone}</div>}
                  </td>
                  <td className="py-2 pr-4 text-gray-500">{emp.startDate?.slice(0, 10) ?? '—'}</td>
                  {isAdmin && (
                    <td className="py-2">
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(emp)}
                          className="text-xs text-brand-600 hover:text-brand-800">Edit</button>
                        <button onClick={() => toggleActive.mutate(emp)}
                          className="text-xs text-gray-400 hover:text-gray-600">
                          {emp.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => { if (confirm(`Delete ${emp.fullName}?`)) deleteMutation.mutate(emp.id) }}
                          className="text-xs text-red-400 hover:text-red-600">Delete</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!isLoading && visible.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-12">No employees found.</p>
        )}
      </div>

      {showModal && (
        <EmployeeModal open onClose={() => setShowModal(false)} initial={editing} />
      )}
    </div>
  )
}
