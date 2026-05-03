import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, errorMessage } from '@/lib/api-client'
import { auth } from '@/lib/auth'
import { useSchoolYears, currentSchoolYearName } from '@/hooks/useSchoolYear'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import type { ActivityDTO, CreateActivityDTO, ChildDTO } from '@fin-tribe/shared-types'

function useActivities(schoolYearId: string) {
  return useQuery({
    queryKey: ['activities', schoolYearId],
    queryFn:  () => apiClient.get<ActivityDTO[]>(`/v1/activities/${schoolYearId}`),
    enabled:  !!schoolYearId,
  })
}

function useStudents(schoolYearId: string) {
  return useQuery({
    queryKey: ['children', schoolYearId],
    queryFn:  () => apiClient.get<ChildDTO[]>(`/v1/meals/children/${schoolYearId}`),
    enabled:  !!schoolYearId,
  })
}

// ─── Activity form modal ──────────────────────────────────────────────────────
function ActivityModal({ open, onClose, schoolYearId, initial }: {
  open: boolean; onClose: () => void; schoolYearId: string; initial: ActivityDTO | null
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Omit<CreateActivityDTO, 'schoolYearId'>>({
    name:        initial?.name        ?? '',
    description: initial?.description ?? '',
    schedule:    initial?.schedule    ?? '',
    capacity:    initial?.capacity    ?? undefined,
  })

  const mutation = useMutation({
    mutationFn: () => initial
      ? apiClient.put(`/v1/activities/${initial.id}`, form)
      : apiClient.post('/v1/activities', { ...form, schoolYearId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['activities'] }); onClose() },
  })

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Activity' : 'New Activity'}>
      <div className="space-y-3">
        <Input label="Activity name *" value={form.name} onChange={set('name')} />
        <Input label="Description" value={form.description ?? ''} onChange={set('description')} />
        <Input label="Schedule" value={form.schedule ?? ''} onChange={set('schedule')} placeholder="ex: Monday 15:00–16:00" />
        <Input label="Capacity" type="number" value={form.capacity != null ? String(form.capacity) : ''}
          onChange={e => setForm(f => ({ ...f, capacity: e.target.value ? parseInt(e.target.value) : undefined }))} />
        {mutation.isError && <p className="text-sm text-red-600">{errorMessage(mutation.error)}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name}>
          {mutation.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Modal>
  )
}

// ─── Enrol student modal ──────────────────────────────────────────────────────
function EnrolModal({ open, onClose, activity, schoolYearId }: {
  open: boolean; onClose: () => void; activity: ActivityDTO; schoolYearId: string
}) {
  const qc = useQueryClient()
  const { data: allStudents = [] } = useStudents(schoolYearId)
  const enrolled = new Set(activity.students.map(s => s.id))
  const available = allStudents.filter(s => s.isActive && !enrolled.has(s.id))

  const enrol = useMutation({
    mutationFn: (studentId: string) =>
      apiClient.post(`/v1/activities/${activity.id}/students`, { studentId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  })
  const unenrol = useMutation({
    mutationFn: (studentId: string) =>
      apiClient.delete(`/v1/activities/${activity.id}/students/${studentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  })

  return (
    <Modal open={open} onClose={onClose} title={`Students — ${activity.name}`}>
      <div className="space-y-4">
        {/* Enrolled */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Enrolled ({activity.students.length}{activity.capacity ? ` / ${activity.capacity}` : ''})
          </p>
          {activity.students.length === 0 ? (
            <p className="text-sm text-gray-400">No students enrolled yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
              {activity.students.map(s => (
                <li key={s.id} className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm font-medium text-gray-800">{s.fullName}</span>
                  <button onClick={() => unenrol.mutate(s.id)}
                    className="text-xs text-red-400 hover:text-red-600">Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Available to enrol */}
        {available.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Add student</p>
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg max-h-48 overflow-auto">
              {available.map(s => (
                <li key={s.id} className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-gray-700">{s.fullName}</span>
                  <button onClick={() => enrol.mutate(s.id)}
                    className="text-xs text-brand-600 hover:text-brand-800 font-medium">+ Enrol</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="flex justify-end pt-2">
        <Button onClick={onClose}>Done</Button>
      </div>
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ActivitiesPage() {
  const isAdmin = auth.getUser()?.role === 'admin'
  const qc = useQueryClient()

  const { data: years = [] }    = useSchoolYears()
  const currentYearName         = currentSchoolYearName()
  const currentYear             = years.find(y => y.name === currentYearName) ?? years[0]
  const [selectedYearId, setSelectedYearId] = useState('')
  const schoolYearId = selectedYearId || currentYear?.id || ''

  const { data: activities = [], isLoading } = useActivities(schoolYearId)
  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState<ActivityDTO | null>(null)
  const [enrolTarget, setEnrolTarget] = useState<ActivityDTO | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/v1/activities/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  })

  function openEdit(a: ActivityDTO) { setEditing(a); setShowModal(true) }
  function openNew()                 { setEditing(null); setShowModal(true) }

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Extra-curricular Activities"
        subtitle={`${activities.length} activities`}
        actions={
          <div className="flex items-center gap-2">
            <select
              value={schoolYearId} onChange={e => setSelectedYearId(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none"
            >
              {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
            {isAdmin && <Button size="sm" onClick={openNew}>+ New Activity</Button>}
          </div>
        }
      />

      <div className="flex-1 overflow-auto px-8 pb-8">
        {isLoading ? (
          <p className="text-sm text-gray-400 py-4">Loading…</p>
        ) : activities.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No activities yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2">
            {activities.map(activity => (
              <div key={activity.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{activity.name}</h3>
                    {activity.description && <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>}
                  </div>
                  {!activity.isActive && (
                    <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">Inactive</span>
                  )}
                </div>

                {activity.schedule && (
                  <p className="text-xs text-gray-500">🕐 {activity.schedule}</p>
                )}

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setEnrolTarget(activity)}
                    className="text-sm font-medium text-brand-600 hover:text-brand-800"
                  >
                    {activity.students.length} student{activity.students.length !== 1 ? 's' : ''}
                    {activity.capacity ? ` / ${activity.capacity}` : ''}
                  </button>

                  {isAdmin && (
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(activity)}
                        className="text-xs text-gray-400 hover:text-gray-600">Edit</button>
                      <button
                        onClick={() => { if (confirm(`Delete "${activity.name}"?`)) deleteMutation.mutate(activity.id) }}
                        className="text-xs text-red-400 hover:text-red-600">Delete</button>
                    </div>
                  )}
                </div>

                {/* Student chips */}
                {activity.students.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {activity.students.slice(0, 5).map(s => (
                      <span key={s.id} className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                        {s.fullName.split(' ')[0]}
                      </span>
                    ))}
                    {activity.students.length > 5 && (
                      <span className="text-xs text-gray-400">+{activity.students.length - 5} more</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <ActivityModal open onClose={() => setShowModal(false)} schoolYearId={schoolYearId} initial={editing} />
      )}
      {enrolTarget && (
        <EnrolModal open onClose={() => setEnrolTarget(null)} activity={enrolTarget} schoolYearId={schoolYearId} />
      )}
    </div>
  )
}
