import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, errorMessage } from '@/lib/api-client'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { ImportResultDTO } from '@document-intel/shared-types'

interface StudentRow { fullName: string; tuitionType: string }
interface Preview { rows: StudentRow[]; parseErrors: string[] }

type Step = 'upload' | 'review' | 'done'

export function StudentImportModal({ open, onClose, schoolYearId }: {
  open: boolean; onClose: () => void; schoolYearId: string
}) {
  const qc = useQueryClient()
  const [step, setStep]       = useState<Step>('upload')
  const [file, setFile]       = useState<File | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [result, setResult]   = useState<ImportResultDTO | null>(null)

  const previewMutation = useMutation({
    mutationFn: async (f: File) => {
      const form = new FormData()
      form.append('file', f)
      const token = localStorage.getItem('access_token')
      const base  = import.meta.env.VITE_API_URL ?? ''
      const res   = await fetch(`${base}/v1/meals/children/import/preview`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error ?? res.statusText) }
      return res.json() as Promise<Preview>
    },
    onSuccess: (data) => { setPreview(data); setStep('review') },
  })

  const confirmMutation = useMutation({
    mutationFn: () => apiClient.post<ImportResultDTO>('/v1/meals/children/import/confirm', {
      schoolYearId,
      rows: preview!.rows,
    }),
    onSuccess: (data) => {
      setResult(data); setStep('done')
      qc.invalidateQueries({ queryKey: ['children'] })
    },
  })

  function handleClose() {
    setStep('upload'); setFile(null); setPreview(null); setResult(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Import Students from CSV">
      {step === 'upload' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload a CSV file with columns: <strong>Nome</strong> (required), <strong>Propina/Tuition</strong> (optional).
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CSV file</label>
            <input type="file" accept=".csv,.txt"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>
          {previewMutation.isError && <p className="text-sm text-red-600">{errorMessage(previewMutation.error)}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button onClick={() => file && previewMutation.mutate(file)} disabled={!file || previewMutation.isPending}>
              {previewMutation.isPending ? 'Parsing…' : 'Parse file →'}
            </Button>
          </div>
        </div>
      )}

      {step === 'review' && preview && (
        <div className="space-y-4">
          {preview.parseErrors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">Warnings</p>
              <ul className="text-xs text-amber-600 space-y-0.5">{preview.parseErrors.map((e, i) => <li key={i}>• {e}</li>)}</ul>
            </div>
          )}
          <p className="text-sm font-medium text-gray-700">{preview.rows.length} students to import</p>
          <div className="max-h-64 overflow-auto border border-gray-200 rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="text-left text-gray-500">
                  <th className="px-3 py-1.5 font-medium">Name</th>
                  <th className="px-3 py-1.5 font-medium">Tuition type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.rows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-1.5 font-medium text-gray-900">{r.fullName}</td>
                    <td className="px-3 py-1.5 text-gray-500">{r.tuitionType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {confirmMutation.isError && <p className="text-sm text-red-600">{errorMessage(confirmMutation.error)}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setStep('upload')}>← Back</Button>
            <Button onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending || !preview.rows.length}>
              {confirmMutation.isPending ? 'Importing…' : `Import ${preview.rows.length} students`}
            </Button>
          </div>
        </div>
      )}

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
            <ul className="text-xs text-red-600 space-y-0.5 max-h-32 overflow-auto">
              {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          )}
          <div className="flex justify-end"><Button onClick={handleClose}>Close</Button></div>
        </div>
      )}
    </Modal>
  )
}
