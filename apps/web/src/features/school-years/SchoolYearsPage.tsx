import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiClient } from '@/lib/api-client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import type { SchoolYearDTO } from '@fin-tribe/shared-types'

function useSchoolYearsAdmin() {
  return useQuery({
    queryKey: ['school-years'],
    queryFn:  () => apiClient.get<SchoolYearDTO[]>('/v1/school-years'),
  })
}

function AddSchoolYearModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' })

  const mutation = useMutation({
    mutationFn: () => apiClient.post('/v1/school-years', form),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['school-years'] }); onClose() },
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <Modal open={open} onClose={onClose} title={t('schoolYears.add')}>
      <div className="space-y-3">
        <Input label={t('schoolYears.name')} value={form.name} onChange={set('name')}
          placeholder="ex: 2026-27" />
        <Input label={t('schoolYears.startDate')} type="date" value={form.startDate} onChange={set('startDate')} />
        <Input label={t('schoolYears.endDate')}   type="date" value={form.endDate}   onChange={set('endDate')} />
        {mutation.isError && <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !form.name || !form.startDate || !form.endDate}
        >
          {mutation.isPending ? t('common.loading') : t('common.save')}
        </Button>
      </div>
    </Modal>
  )
}

export default function SchoolYearsPage() {
  const { t } = useTranslation()
  const { data: years = [], isLoading } = useSchoolYearsAdmin()
  const [showAdd, setShowAdd] = useState(false)

  if (isLoading) return <div className="p-8 text-gray-400 text-sm">{t('common.loading')}</div>

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title={t('nav.schoolYears')}
        subtitle={`${years.length} anos`}
        actions={<Button size="sm" onClick={() => setShowAdd(true)}>+ {t('schoolYears.add')}</Button>}
      />

      <div className="flex-1 overflow-auto px-8 pb-8">
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-sm max-w-lg">
          {years.map(y => (
            <div key={y.id} className="flex items-center gap-4 px-4 py-4">
              <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center text-brand-700 font-bold text-xs">
                {y.name.slice(-2)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{y.name}</p>
                <p className="text-xs text-gray-400">{y.startDate.slice(0, 10)} → {y.endDate.slice(0, 10)}</p>
              </div>
            </div>
          ))}
          {years.length === 0 && (
            <p className="px-4 py-8 text-sm text-gray-400 text-center">{t('schoolYears.empty')}</p>
          )}
        </div>
      </div>

      {showAdd && <AddSchoolYearModal open onClose={() => setShowAdd(false)} />}
    </div>
  )
}
