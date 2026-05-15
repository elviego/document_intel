import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiClient, errorMessage } from '@/lib/api-client'
import { useCategories } from '@/hooks/useCategories'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import type { CategoryDTO } from '@document-intel/shared-types'

// ─── Add / Edit Category Modal ────────────────────────────────────────────────
function CategoryModal({
  open, onClose, initial,
}: { open: boolean; onClose: () => void; initial?: CategoryDTO }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState({
    namePt: initial?.namePt ?? '',
    nameEn: initial?.nameEn ?? '',
    groupPt: initial?.groupPt ?? '',
    groupEn: initial?.groupEn ?? '',
    classification: initial?.classification ?? 'despesa',
    descriptionPt: initial?.descriptionPt ?? '',
    descriptionEn: initial?.descriptionEn ?? '',
  })

  const mutation = useMutation({
    mutationFn: () => initial
      ? apiClient.patch(`/v1/categories/${initial.id}`, form)
      : apiClient.post('/v1/categories', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      onClose()
    },
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <Modal open={open} onClose={onClose} title={initial ? t('categories.edit') : t('categories.add')}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('categories.namePt')} value={form.namePt} onChange={set('namePt')} />
          <Input label={t('categories.nameEn')} value={form.nameEn} onChange={set('nameEn')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('categories.groupPt')} value={form.groupPt} onChange={set('groupPt')} />
          <Input label={t('categories.groupEn')} value={form.groupEn} onChange={set('groupEn')} />
        </div>
        <Select
          label={t('categories.classification')}
          value={form.classification}
          onChange={set('classification')}
          options={[
            { value: 'despesa', label: 'Despesa' },
            { value: 'receita', label: 'Receita' },
          ]}
        />
        <Input label={t('categories.descriptionPt')} value={form.descriptionPt} onChange={set('descriptionPt')} />
        <Input label={t('categories.descriptionEn')} value={form.descriptionEn} onChange={set('descriptionEn')} />
        {mutation.isError && <p className="text-sm text-red-600">{errorMessage(mutation.error)}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.namePt}>
          {mutation.isPending ? t('common.loading') : t('common.save')}
        </Button>
      </div>
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const { t } = useTranslation()
  const { data: categories = [], isLoading } = useCategories(true)
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<CategoryDTO | null>(null)
  const [filter, setFilter]   = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(`/v1/categories/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })

  const importMutation = useMutation({
    mutationFn: (csv: string) => apiClient.post('/v1/categories/import', { csv }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const csv = ev.target?.result as string
      importMutation.mutate(csv)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const filtered = categories.filter(c =>
    !filter || c.namePt.toLowerCase().includes(filter.toLowerCase()) ||
    c.nameEn.toLowerCase().includes(filter.toLowerCase())
  )

  const grouped: Record<string, CategoryDTO[]> = {}
  filtered.forEach(c => {
    const grp = c.classification === 'receita' ? `Receita — ${c.groupPt}` : `Despesa — ${c.groupPt}`
    ;(grouped[grp] ??= []).push(c)
  })

  if (isLoading) return <div className="p-8 text-gray-400 text-sm">{t('common.loading')}</div>

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title={t('nav.categories')}
        subtitle={`${categories.filter(c => c.isActive).length} ativas`}
        actions={
          <div className="flex items-center gap-2">
            <input
              value={filter} onChange={e => setFilter(e.target.value)}
              placeholder={t('common.search')}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              ↑ {t('common.import')} CSV
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}>+ {t('categories.add')}</Button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto px-8 pb-8 space-y-6">
        {Object.entries(grouped).sort().map(([group, cats]) => (
          <div key={group}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{group}</h3>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-sm">
              {cats.map(cat => (
                <div key={cat.id} className={`flex items-center gap-4 px-4 py-3 ${!cat.isActive ? 'opacity-50' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{cat.namePt}</p>
                    <p className="text-xs text-gray-400">{cat.nameEn}</p>
                  </div>
                  <Badge variant={cat.classification === 'receita' ? 'green' : 'red'}>
                    {cat.classification}
                  </Badge>
                  <button
                    onClick={() => toggleActive.mutate({ id: cat.id, isActive: !cat.isActive })}
                    className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                      cat.isActive ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      cat.isActive ? 'translate-x-4' : ''
                    }`} />
                  </button>
                  <button
                    onClick={() => setEditing(cat)}
                    className="text-xs text-gray-400 hover:text-gray-700"
                  >
                    ✎
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showAdd && <CategoryModal open onClose={() => setShowAdd(false)} />}
      {editing && <CategoryModal open onClose={() => setEditing(null)} initial={editing} />}
    </div>
  )
}
