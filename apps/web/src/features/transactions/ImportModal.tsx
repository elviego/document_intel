import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { utils, writeFile } from 'xlsx'
import { apiClient, errorMessage } from '@/lib/api-client'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type {
  ImportPreviewDTO, ImportRowDTO, NewCategoryInput, ImportResultDTO,
} from '@document-intel/shared-types'

type Step = 'upload' | 'review' | 'done'

const CLASSIFICATIONS = [
  { value: 'despesa', label: 'Despesa (Expense)' },
  { value: 'receita', label: 'Receita (Income)' },
]

// ─── Template download ────────────────────────────────────────────────────────
function downloadTemplate() {
  const ws = utils.aoa_to_sheet([
    ['Data', 'Tipo', 'Valor', 'Descrição', 'Conta'],
    ['2025-09-01', 'Rendas', '-1200', 'Renda setembro', 'CGD'],
    ['2025-09-05', 'Propinas', '800', 'Propina João', 'CGD'],
  ])
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Movimentos')
  writeFile(wb, 'template_movimentos.xlsx')
}

// ─── New category form ────────────────────────────────────────────────────────
function NewCategoryForm({
  namePt, value, onChange,
}: {
  namePt: string
  value: NewCategoryInput
  onChange: (v: NewCategoryInput) => void
}) {
  const set = (k: keyof NewCategoryInput) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange({ ...value, [k]: e.target.value })

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-2">
      <p className="text-xs font-semibold text-amber-800">New category: <span className="font-bold">{namePt}</span></p>
      <div className="grid grid-cols-2 gap-2">
        <Input label="Name (EN)" value={value.nameEn} onChange={set('nameEn')} placeholder="English name" />
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-700">Classification</label>
          <select
            value={value.classification}
            onChange={set('classification')}
            className="block w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {CLASSIFICATIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <Input label="Group (PT)" value={value.groupPt} onChange={set('groupPt')} placeholder="ex: Pessoal" />
        <Input label="Group (EN)" value={value.groupEn} onChange={set('groupEn')} placeholder="ex: Personnel" />
      </div>
      <Input label="Description (optional)" value={value.descriptionPt ?? ''} onChange={set('descriptionPt')} />
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export function ImportModal({
  open, onClose, schoolYearId,
}: {
  open: boolean
  onClose: () => void
  schoolYearId: string
}) {
  const qc = useQueryClient()
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreviewDTO | null>(null)
  const [newCategories, setNewCategories] = useState<NewCategoryInput[]>([])
  const [result, setResult] = useState<ImportResultDTO | null>(null)

  // Step 1 → 2: upload and preview
  const previewMutation = useMutation({
    mutationFn: async (f: File) => {
      const form = new FormData()
      form.append('file', f)
      const token = localStorage.getItem('access_token')
      const base = import.meta.env.VITE_API_URL ?? ''
      const res = await fetch(`${base}/v1/transactions/import/preview`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `${res.status} ${res.statusText}`)
      }
      return res.json() as Promise<ImportPreviewDTO>
    },
    onSuccess: (data) => {
      setPreview(data)
      setNewCategories(data.unknownCategories.map(namePt => ({
        namePt,
        nameEn: '',
        classification: 'despesa' as const,
        groupPt: '',
        groupEn: '',
        descriptionPt: '',
      })))
      setStep('review')
    },
  })

  // Step 2 → 3: confirm import
  const confirmMutation = useMutation({
    mutationFn: () => apiClient.post<ImportResultDTO>('/v1/transactions/import/confirm', {
      schoolYearId,
      rows: preview!.rows,
      newCategories,
    }),
    onSuccess: (data) => {
      setResult(data)
      setStep('done')
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })

  const updateNewCat = (i: number, v: NewCategoryInput) =>
    setNewCategories(prev => prev.map((c, idx) => idx === i ? v : c))

  const newCatsValid = newCategories.every(c => c.nameEn && c.groupPt && c.groupEn)

  function handleClose() {
    setStep('upload'); setFile(null); setPreview(null); setNewCategories([]); setResult(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Import Movements from Excel">

      {/* ── Step 1: Upload ── */}
      {step === 'upload' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload an Excel file (.xlsx) with columns: <strong>Data</strong>, <strong>Tipo</strong>,{' '}
            <strong>Valor</strong>, <strong>Descrição</strong>, <strong>Conta</strong>.
          </p>
          <button
            onClick={downloadTemplate}
            className="text-xs text-brand-600 underline hover:text-brand-800"
          >
            ↓ Download template
          </button>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Excel file</label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>
          {previewMutation.isError && (
            <p className="text-sm text-red-600">{errorMessage(previewMutation.error)}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button
              onClick={() => file && previewMutation.mutate(file)}
              disabled={!file || previewMutation.isPending}
            >
              {previewMutation.isPending ? 'Parsing…' : 'Parse file →'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Review ── */}
      {step === 'review' && preview && (
        <div className="space-y-4">
          {/* Parse errors */}
          {preview.parseErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-700 mb-1">Parse errors ({preview.parseErrors.length} rows skipped)</p>
              <ul className="text-xs text-red-600 space-y-0.5 max-h-24 overflow-auto">
                {preview.parseErrors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            </div>
          )}

          {/* Unknown accounts warning */}
          {preview.unknownAccounts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">Unknown bank accounts — rows will be skipped</p>
              <p className="text-xs text-amber-600">{preview.unknownAccounts.join(', ')}</p>
              <p className="text-xs text-amber-500 mt-1">Create these accounts in Settings first, then re-import.</p>
            </div>
          )}

          {/* New categories */}
          {newCategories.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                {newCategories.length} new {newCategories.length === 1 ? 'category' : 'categories'} found — fill in details to create:
              </p>
              {newCategories.map((cat, i) => (
                <NewCategoryForm
                  key={cat.namePt}
                  namePt={cat.namePt}
                  value={cat}
                  onChange={v => updateNewCat(i, v)}
                />
              ))}
            </div>
          )}

          {/* Row preview */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">{preview.rows.length} rows to import</p>
            <div className="max-h-48 overflow-auto border border-gray-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="text-left text-gray-500">
                    <th className="px-2 py-1.5 font-medium">Date</th>
                    <th className="px-2 py-1.5 font-medium">Category</th>
                    <th className="px-2 py-1.5 font-medium">Account</th>
                    <th className="px-2 py-1.5 font-medium text-right">Amount</th>
                    <th className="px-2 py-1.5 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.rows.map((row: ImportRowDTO) => (
                    <tr key={row.rowIndex} className="hover:bg-gray-50">
                      <td className="px-2 py-1 text-gray-500 whitespace-nowrap">{row.date}</td>
                      <td className="px-2 py-1 font-medium">{row.categoryName}</td>
                      <td className="px-2 py-1 text-gray-500">{row.bankAccountName || '—'}</td>
                      <td className={`px-2 py-1 text-right font-mono font-semibold ${row.amount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {row.amount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                      </td>
                      <td className="px-2 py-1 text-gray-500 truncate max-w-[160px]">{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {confirmMutation.isError && (
            <p className="text-sm text-red-600">{errorMessage(confirmMutation.error)}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setStep('upload')}>← Back</Button>
            <Button
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending || !newCatsValid || preview.rows.length === 0}
            >
              {confirmMutation.isPending ? 'Importing…' : `Import ${preview.rows.length} rows`}
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Done ── */}
      {step === 'done' && result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{result.imported}</p>
              <p className="text-xs text-green-600 mt-0.5">Imported</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-500">{result.skipped}</p>
              <p className="text-xs text-gray-400 mt-0.5">Skipped</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-500">{result.errors.length}</p>
              <p className="text-xs text-red-400 mt-0.5">Errors</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-700 mb-1">Errors</p>
              <ul className="text-xs text-red-600 space-y-0.5 max-h-32 overflow-auto">
                {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleClose}>Close</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
