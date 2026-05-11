import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { errorMessage } from '@/lib/api-client'
import {
  useOcrDocuments, useUploadDocument, useBatchUpload,
  useProcessDocument, useDeleteDocument,
} from './hooks/useOcr'
import type { OcrDocument, OcrDocumentType, OcrStatus } from './hooks/useOcr'
import { ConfidenceBadge } from './components/ConfidenceBadge'

export const DOC_TYPES: { value: OcrDocumentType; label: string }[] = [
  { value: 'invoice',        label: 'Invoice' },
  { value: 'receipt',        label: 'Receipt' },
  { value: 'contract',       label: 'Contract' },
  { value: 'id_document',    label: 'ID Document' },
  { value: 'medical',        label: 'Medical' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'form',           label: 'Form' },
  { value: 'other',          label: 'Other' },
]

const STATUS_VARIANT: Record<OcrStatus, 'gray' | 'blue' | 'green' | 'red'> = {
  pending: 'gray', processing: 'blue', completed: 'green', failed: 'red',
} as any

function fmtSize(bytes: number) {
  if (bytes < 1024)         return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ── Upload Modal (single + batch) ─────────────────────────────────────────────

function UploadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t }    = useTranslation()
  const fileRef  = useRef<HTMLInputElement>(null)
  const [files,        setFiles]        = useState<File[]>([])
  const [autoDetect,   setAutoDetect]   = useState(true)
  const [documentType, setDocumentType] = useState<OcrDocumentType | ''>('')
  const [autoProcess,  setAutoProcess]  = useState(true)
  const [dragOver,     setDragOver]     = useState(false)
  const [batchResults, setBatchResults] = useState<{ fileName: string; id?: string; error?: string }[] | null>(null)

  const upload      = useUploadDocument()
  const batchUpload = useBatchUpload()

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return
    setFiles(prev => [...prev, ...Array.from(incoming)])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  const handleSubmit = async () => {
    if (files.length === 0) return

    if (files.length === 1) {
      const fd = new FormData()
      fd.append('file', files[0])
      fd.append('autoDetectType', String(autoDetect))
      fd.append('autoProcess',    String(autoProcess))
      if (!autoDetect && documentType) fd.append('documentType', documentType)
      await upload.mutateAsync(fd)
      handleClose()
    } else {
      const fd = new FormData()
      for (const f of files) {
        fd.append('file', f)
      }
      fd.append('autoDetectType', String(autoDetect))
      fd.append('autoProcess',    String(autoProcess))
      if (!autoDetect && documentType) fd.append('documentType', documentType)
      const res = await batchUpload.mutateAsync(fd)
      setBatchResults(res.results)
    }
  }

  const handleClose = () => {
    onClose(); setFiles([]); setBatchResults(null)
    upload.reset(); batchUpload.reset()
  }

  const isPending = upload.isPending || batchUpload.isPending

  if (batchResults) {
    return (
      <Modal open={open} onClose={handleClose} title={`Batch upload — ${batchResults.length} files`}>
        <div className="space-y-2 max-h-64 overflow-auto">
          {batchResults.map((r, i) => (
            <div key={i} className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg ${r.error ? 'bg-red-50' : 'bg-green-50'}`}>
              <span className="truncate text-gray-700">{r.fileName}</span>
              {r.error
                ? <span className="text-red-600 text-xs ml-2 shrink-0">{r.error}</span>
                : <span className="text-green-600 text-xs ml-2 shrink-0">✓ uploaded</span>}
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={handleClose}>Close</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={handleClose} title={t('ocr.uploadDocument')}>
      <div className="space-y-4">
        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp,.webp"
            className="hidden" onChange={e => addFiles(e.target.files)} />
          {files.length > 0 ? (
            <div className="space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-sm text-gray-700">
                  <span className="truncate">{f.name}</span>
                  <span className="text-gray-400 ml-3 shrink-0">{fmtSize(f.size)}</span>
                </div>
              ))}
              <p className="text-xs text-gray-400 mt-2">Click to add more files</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500">Drop files here, or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">PDF, PNG, JPG, TIFF, BMP, WebP · Multiple files supported</p>
            </div>
          )}
        </div>

        {files.length > 0 && (
          <button onClick={() => setFiles([])} className="text-xs text-red-500 hover:underline">
            Clear all files
          </button>
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={autoDetect} onChange={e => setAutoDetect(e.target.checked)}
            className="rounded border-gray-300 text-brand-600" />
          <span className="text-sm text-gray-700">{t('ocr.autoDetectType')}</span>
        </label>

        {!autoDetect && (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">{t('ocr.documentType')}</label>
            <select value={documentType} onChange={e => setDocumentType(e.target.value as OcrDocumentType)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
              <option value="">— Select type —</option>
              {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={autoProcess} onChange={e => setAutoProcess(e.target.checked)}
            className="rounded border-gray-300 text-brand-600" />
          <span className="text-sm text-gray-700">{t('ocr.processAfterUpload')}</span>
        </label>

        {(upload.isError || batchUpload.isError) && (
          <p className="text-sm text-red-600">{errorMessage(upload.error ?? batchUpload.error)}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={handleClose} disabled={isPending}>{t('common.cancel')}</Button>
        <Button onClick={handleSubmit} disabled={files.length === 0 || isPending}>
          {isPending ? t('common.loading')
            : files.length > 1 ? `Upload ${files.length} files`
            : t('ocr.upload')}
        </Button>
      </div>
    </Modal>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OcrPage() {
  const { t }                   = useTranslation()
  const [showUpload, setShowUpload] = useState(false)
  const [page, setPage]         = useState(0)
  const { data, isLoading }     = useOcrDocuments(page)
  const process                 = useProcessDocument()
  const remove                  = useDeleteDocument()

  const docs  = data?.items  ?? []
  const total = data?.total  ?? 0

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title={t('ocr.title')}
        subtitle={`${total} ${t('ocr.documents')}`}
        actions={
          <>
            <Link to="/ocr/config"><Button variant="secondary" size="sm">{t('ocr.settings')}</Button></Link>
            <Link to="/ocr/metrics"><Button variant="secondary" size="sm">{t('ocr.metricsNav')}</Button></Link>
            <Button size="sm" onClick={() => setShowUpload(true)}>+ {t('ocr.uploadDocument')}</Button>
          </>
        }
      />

      <div className="flex-1 overflow-auto px-8 pb-8">
        {isLoading ? (
          <p className="text-sm text-gray-400 py-4">{t('common.loading')}</p>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-4xl mb-4">📄</div>
            <p className="text-gray-500 text-sm">{t('ocr.noDocuments')}</p>
            <Button size="sm" className="mt-4" onClick={() => setShowUpload(true)}>{t('ocr.uploadFirst')}</Button>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
                <th className="pb-2 pr-4 font-medium">{t('ocr.fileName')}</th>
                <th className="pb-2 pr-4 font-medium">{t('ocr.documentType')}</th>
                <th className="pb-2 pr-4 font-medium">{t('ocr.status')}</th>
                <th className="pb-2 pr-4 font-medium">{t('ocr.size')}</th>
                <th className="pb-2 pr-4 font-medium">{t('ocr.uploadedAt')}</th>
                <th className="pb-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {docs.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-50 group">
                  <td className="py-2 pr-4">
                    <Link to={`/ocr/${doc.id}`} className="font-medium text-brand-700 hover:underline">{doc.fileName}</Link>
                    {doc.autoDetectType && <span className="ml-2 text-xs text-gray-400">(auto)</span>}
                  </td>
                  <td className="py-2 pr-4 text-gray-600">
                    {doc.documentType
                      ? DOC_TYPES.find(t => t.value === doc.documentType)?.label ?? doc.documentType
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="py-2 pr-4"><Badge variant={STATUS_VARIANT[doc.status]}>{doc.status}</Badge></td>
                  <td className="py-2 pr-4 text-gray-500 tabular-nums">{fmtSize(doc.fileSizeBytes)}</td>
                  <td className="py-2 pr-4 text-gray-500">{format(new Date(doc.createdAt), 'dd/MM/yyyy HH:mm')}</td>
                  <td className="py-2 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    {doc.status !== 'processing' && (
                      <button
                        className="text-xs text-brand-600 hover:underline"
                        onClick={() => process.mutate({ id: doc.id })}
                        disabled={process.isPending}
                      >
                        {doc.status === 'completed' ? 'Re-run' : 'Process'}
                      </button>
                    )}
                    <Link to={`/ocr/${doc.id}`} className="text-xs text-gray-500 hover:text-gray-700">View</Link>
                    <button
                      className="text-xs text-red-400 hover:text-red-600"
                      onClick={() => { if (confirm('Delete this document?')) remove.mutate(doc.id) }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {total > 50 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="disabled:opacity-40 hover:text-gray-700">← Prev</button>
            <span>Page {page + 1} of {Math.ceil(total / 50)}</span>
            <button disabled={(page + 1) * 50 >= total} onClick={() => setPage(p => p + 1)} className="disabled:opacity-40 hover:text-gray-700">Next →</button>
          </div>
        )}
      </div>

      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} />
    </div>
  )
}
