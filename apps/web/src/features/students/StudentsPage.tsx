import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, errorMessage } from '@/lib/api-client'
import { auth } from '@/lib/auth'
import { useSchoolYears, currentSchoolYearName } from '@/hooks/useSchoolYear'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import type { StudentDTO, CreateStudentDTO, EnrollmentPlanDTO } from '@fin-tribe/shared-types'

function useStudents(schoolYearId: string) {
  return useQuery({
    queryKey: ['students', schoolYearId],
    queryFn:  () => apiClient.get<StudentDTO[]>(`/v1/students/${schoolYearId}?includeInactive=true`),
    enabled:  !!schoolYearId,
  })
}

function usePlans() {
  return useQuery({
    queryKey: ['enrollment-plans'],
    queryFn:  () => apiClient.get<EnrollmentPlanDTO[]>('/v1/enrollment-plans'),
  })
}

const BLOOD_TYPES = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−']

// ─── Student form modal ───────────────────────────────────────────────────────
function StudentModal({ open, onClose, schoolYearId, initial }: {
  open: boolean; onClose: () => void; schoolYearId: string; initial: StudentDTO | null
}) {
  const qc = useQueryClient()
  const { data: plans = [] } = usePlans()
  const [tab, setTab] = useState<'basic' | 'personal' | 'parents'>('basic')

  const blank: CreateStudentDTO = {
    fullName: '', schoolYearId, tuitionType: '', firstName: '', lastName: '',
    birthDate: '', nationality: 'Portuguesa', nif: '', address: '',
    bloodType: '', allergies: '', medicalNotes: '', photoConsent: false,
    enrollmentDate: '', planId: '',
    parent1FirstName: '', parent1LastName: '', parent1Phone: '', parent1Email: '', parent1Relation: 'Mãe/Pai',
    parent2FirstName: '', parent2LastName: '', parent2Phone: '', parent2Email: '', parent2Relation: '',
    emergencyContact: '', emergencyPhone: '', notes: '',
  }

  const [form, setForm] = useState<CreateStudentDTO>(initial ? {
    fullName:         initial.fullName,
    schoolYearId:     initial.schoolYearId,
    tuitionType:      initial.tuitionType,
    firstName:        initial.firstName        ?? '',
    lastName:         initial.lastName         ?? '',
    birthDate:        initial.birthDate        ?? '',
    nationality:      initial.nationality      ?? 'Portuguesa',
    nif:              initial.nif              ?? '',
    address:          initial.address          ?? '',
    bloodType:        initial.bloodType        ?? '',
    allergies:        initial.allergies        ?? '',
    medicalNotes:     initial.medicalNotes     ?? '',
    photoConsent:     initial.photoConsent,
    enrollmentDate:   initial.enrollmentDate   ?? '',
    planId:           initial.plan?.id         ?? '',
    parent1FirstName: initial.parent1FirstName ?? '',
    parent1LastName:  initial.parent1LastName  ?? '',
    parent1Phone:     initial.parent1Phone     ?? '',
    parent1Email:     initial.parent1Email     ?? '',
    parent1Relation:  initial.parent1Relation  ?? 'Mãe/Pai',
    parent2FirstName: initial.parent2FirstName ?? '',
    parent2LastName:  initial.parent2LastName  ?? '',
    parent2Phone:     initial.parent2Phone     ?? '',
    parent2Email:     initial.parent2Email     ?? '',
    parent2Relation:  initial.parent2Relation  ?? '',
    emergencyContact: initial.emergencyContact ?? '',
    emergencyPhone:   initial.emergencyPhone   ?? '',
    notes:            initial.notes            ?? '',
  } : blank)

  const set = (k: keyof CreateStudentDTO) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  // Auto-fill fullName from first+last name
  const handleName = (k: 'firstName' | 'lastName') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setForm(f => {
      const updated = { ...f, [k]: val }
      const first = k === 'firstName' ? val : f.firstName
      const last  = k === 'lastName'  ? val : f.lastName
      if (first || last) updated.fullName = `${first ?? ''} ${last ?? ''}`.trim()
      return updated
    })
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        planId:      form.planId      || undefined,
        birthDate:   form.birthDate   || undefined,
        enrollmentDate: form.enrollmentDate || undefined,
      }
      return initial
        ? apiClient.put(`/v1/students/${initial.id}`, payload)
        : apiClient.post('/v1/students', payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); onClose() },
  })

  const tabs = [
    { key: 'basic',    label: 'Geral' },
    { key: 'personal', label: 'Dados Pessoais' },
    { key: 'parents',  label: 'Encarregados' },
  ] as const

  return (
    <Modal open={open} onClose={onClose} title={initial ? `Editar — ${initial.fullName}` : 'Nova Criança'}>
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-4 -mx-6 px-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>{t.label}</button>
        ))}
      </div>

      <div className="space-y-3 min-h-[280px]">
        {tab === 'basic' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Primeiro nome" value={form.firstName ?? ''} onChange={handleName('firstName')} />
              <Input label="Apelido" value={form.lastName ?? ''} onChange={handleName('lastName')} />
            </div>
            <Input label="Nome completo *" value={form.fullName} onChange={set('fullName')} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plano de matrícula</label>
                <select value={form.planId ?? ''} onChange={set('planId')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">— Sem plano —</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <Input label="Tipo de propina" value={form.tuitionType} onChange={set('tuitionType')} placeholder="ex: completa" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Data de matrícula" type="date" value={form.enrollmentDate ?? ''} onChange={set('enrollmentDate')} />
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="consent" checked={form.photoConsent}
                  onChange={e => setForm(f => ({ ...f, photoConsent: e.target.checked }))}
                  className="rounded text-brand-600" />
                <label htmlFor="consent" className="text-sm text-gray-700">Autoriza fotografias</label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea value={form.notes ?? ''} onChange={set('notes')} rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </>
        )}

        {tab === 'personal' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Data de nascimento" type="date" value={form.birthDate ?? ''} onChange={set('birthDate')} />
              <Input label="Nacionalidade" value={form.nationality ?? ''} onChange={set('nationality')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="NIF" value={form.nif ?? ''} onChange={set('nif')} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grupo sanguíneo</label>
                <select value={form.bloodType ?? ''} onChange={set('bloodType')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">—</option>
                  {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <Input label="Morada" value={form.address ?? ''} onChange={set('address')} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alergias / intolerâncias</label>
              <textarea value={form.allergies ?? ''} onChange={set('allergies')} rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas médicas</label>
              <textarea value={form.medicalNotes ?? ''} onChange={set('medicalNotes')} rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Contacto de emergência</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Nome" value={form.emergencyContact ?? ''} onChange={set('emergencyContact')} />
                <Input label="Telefone" value={form.emergencyPhone ?? ''} onChange={set('emergencyPhone')} />
              </div>
            </div>
          </>
        )}

        {tab === 'parents' && (
          <>
            <p className="text-xs font-semibold text-gray-500 uppercase">Encarregado 1</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Primeiro nome" value={form.parent1FirstName ?? ''} onChange={set('parent1FirstName')} />
              <Input label="Apelido" value={form.parent1LastName ?? ''} onChange={set('parent1LastName')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Telefone" value={form.parent1Phone ?? ''} onChange={set('parent1Phone')} />
              <Input label="Email" type="email" value={form.parent1Email ?? ''} onChange={set('parent1Email')} />
            </div>
            <Input label="Parentesco" value={form.parent1Relation ?? ''} onChange={set('parent1Relation')} placeholder="Mãe/Pai" />

            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Encarregado 2</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Primeiro nome" value={form.parent2FirstName ?? ''} onChange={set('parent2FirstName')} />
                <Input label="Apelido" value={form.parent2LastName ?? ''} onChange={set('parent2LastName')} />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Input label="Telefone" value={form.parent2Phone ?? ''} onChange={set('parent2Phone')} />
                <Input label="Email" type="email" value={form.parent2Email ?? ''} onChange={set('parent2Email')} />
              </div>
              <div className="mt-3">
                <Input label="Parentesco" value={form.parent2Relation ?? ''} onChange={set('parent2Relation')} placeholder="Mãe/Pai" />
              </div>
            </div>
          </>
        )}
      </div>

      {mutation.isError && <p className="text-sm text-red-600 mt-2">{errorMessage(mutation.error)}</p>}
      <div className="flex justify-end gap-2 pt-3">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.fullName}>
          {mutation.isPending ? 'A guardar…' : 'Guardar'}
        </Button>
      </div>
    </Modal>
  )
}

// ─── Student detail panel ─────────────────────────────────────────────────────
function StudentCard({ student, isAdmin, onEdit, onToggle, onDelete }: {
  student: StudentDTO
  isAdmin: boolean
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  const age = student.birthDate
    ? Math.floor((Date.now() - new Date(student.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${!student.isActive ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm shrink-0">
          {student.fullName.split(' ').map(w => w[0]).slice(0, 2).join('')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{student.fullName}</p>
          <p className="text-xs text-gray-500">
            {student.plan?.name ?? student.tuitionType}
            {age != null ? ` · ${age} anos` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {student.allergies && (
            <span title={student.allergies} className="text-xs bg-red-50 text-red-600 rounded-full px-2 py-0.5">⚠ alergia</span>
          )}
          <button onClick={() => setExpanded(v => !v)} className="text-xs text-gray-400 hover:text-gray-700">
            {expanded ? '▲' : '▼'}
          </button>
          {isAdmin && (
            <>
              <button onClick={onEdit} className="text-xs text-gray-400 hover:text-gray-600">✎</button>
              <button onClick={onToggle}
                className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${student.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${student.isActive ? 'translate-x-4' : ''}`} />
              </button>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
          {student.birthDate && <p><span className="font-medium">Nasc.:</span> {new Date(student.birthDate).toLocaleDateString('pt-PT')}</p>}
          {student.nationality && <p><span className="font-medium">Nacionalidade:</span> {student.nationality}</p>}
          {student.bloodType && <p><span className="font-medium">Sangue:</span> {student.bloodType}</p>}
          {student.nif && <p><span className="font-medium">NIF:</span> {student.nif}</p>}
          {student.parent1FirstName && (
            <p className="col-span-2"><span className="font-medium">{student.parent1Relation ?? 'Enc. 1'}:</span>{' '}
              {student.parent1FirstName} {student.parent1LastName}
              {student.parent1Phone ? ` · ${student.parent1Phone}` : ''}
              {student.parent1Email ? ` · ${student.parent1Email}` : ''}
            </p>
          )}
          {student.parent2FirstName && (
            <p className="col-span-2"><span className="font-medium">{student.parent2Relation ?? 'Enc. 2'}:</span>{' '}
              {student.parent2FirstName} {student.parent2LastName}
              {student.parent2Phone ? ` · ${student.parent2Phone}` : ''}
            </p>
          )}
          {student.emergencyContact && (
            <p className="col-span-2"><span className="font-medium">Emergência:</span> {student.emergencyContact} {student.emergencyPhone}</p>
          )}
          {student.allergies && <p className="col-span-2 text-red-600"><span className="font-medium">Alergias:</span> {student.allergies}</p>}
          {student.medicalNotes && <p className="col-span-2"><span className="font-medium">Notas médicas:</span> {student.medicalNotes}</p>}
          {student.notes && <p className="col-span-2"><span className="font-medium">Notas:</span> {student.notes}</p>}
          {isAdmin && (
            <button onClick={() => { if (confirm(`Eliminar "${student.fullName}"?`)) onDelete() }}
              className="col-span-2 text-red-400 hover:text-red-600 text-left mt-1">Eliminar</button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function StudentsPage() {
  const isAdmin = auth.getUser()?.role === 'admin'
  const qc = useQueryClient()

  const { data: years = [] } = useSchoolYears()
  const currentYearName = currentSchoolYearName()
  const currentYear = years.find(y => y.name === currentYearName) ?? years[0]
  const [selectedYearId, setSelectedYearId] = useState('')
  const schoolYearId = selectedYearId || currentYear?.id || ''

  const { data: students = [], isLoading } = useStudents(schoolYearId)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<StudentDTO | null>(null)
  const [search, setSearch] = useState('')

  const filtered = students.filter(s =>
    s.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (s.parent1FirstName ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.parent1LastName  ?? '').toLowerCase().includes(search.toLowerCase())
  )
  const active = filtered.filter(s => s.isActive)
  const inactive = filtered.filter(s => !s.isActive)

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.put(`/v1/students/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/v1/students/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  })

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Crianças"
        subtitle={`${active.length} ativas${inactive.length > 0 ? ` · ${inactive.length} inativas` : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar…"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none w-40"
            />
            <select value={schoolYearId} onChange={e => setSelectedYearId(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none">
              {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
            {isAdmin && <Button size="sm" onClick={() => { setEditing(null); setShowModal(true) }}>+ Nova criança</Button>}
          </div>
        }
      />

      <div className="flex-1 overflow-auto px-8 pb-8">
        {isLoading ? (
          <p className="text-sm text-gray-400 py-4">A carregar…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">Nenhuma criança encontrada.</p>
        ) : (
          <div className="space-y-2 pt-2 max-w-4xl">
            {active.map(s => (
              <StudentCard key={s.id} student={s} isAdmin={isAdmin}
                onEdit={() => { setEditing(s); setShowModal(true) }}
                onToggle={() => toggleActive.mutate({ id: s.id, isActive: false })}
                onDelete={() => deleteMutation.mutate(s.id)}
              />
            ))}
            {inactive.length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase pt-4 pb-1">Inativas</p>
                {inactive.map(s => (
                  <StudentCard key={s.id} student={s} isAdmin={isAdmin}
                    onEdit={() => { setEditing(s); setShowModal(true) }}
                    onToggle={() => toggleActive.mutate({ id: s.id, isActive: true })}
                    onDelete={() => deleteMutation.mutate(s.id)}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <StudentModal open onClose={() => setShowModal(false)} schoolYearId={schoolYearId} initial={editing} />
      )}
    </div>
  )
}
