import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { errorMessage } from '@/lib/api-client'
import { useOcrDocuments, useUploadDocument, useProcessDocument } from './hooks/useOcr'
import type { OcrDocument, OcrDocumentType, OcrStatus } from './hooks/useOcr'
import { ConfidenceBadge } from './components/ConfidenceBadge'

const DOC_TYPES: { value: OcrDocumentType; label: string }[] = [
  { value: 'invoice',       label: 'Invoice' },
  { value: 'receipt',       label: 'Receipt' },
  { value: 'contract',      label: 'Contract' },
  { value: 'id_document',   label: 'ID Document' },
  { value: 'medical',       label: 'Medical' },
  { value: 'bank_statement',label: 'Bank Statement' },
  { value: 'form',          label: 'Form' },
  { value: 'other',         label: 'Other' },
]

function statusBadge(status: OcrStatus) {
  const map: Record<OcrStatus, 'gray' | 'blue' | 'green' | 'red'> = {
    pending:    'gray',
    processing: 'blue',
    completed:  'green',
    failed:     'red',
  } as any
  return <Badge variant={map[status] ?? 'gray'}>{status}</Badge>
}

function fmtSize(bytes: number) {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ── Upload Modal ──────────────────────────────────────────────────────────────

function UploadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file,           setFile]           = useState<File | null>(null)
  const [autoDetect,     setAutoDetect]     = useState(true)
  const [documentType,   setDocumentType]   = useState<OcrDocumentType | ''>('')
  const [autoProcess,    setAutoProcess]    = useState(true)
  const [dragOver,       setDragOver]       = useState(false)

  const upload  = useUploadDocument()
  const process = useProcessDocument()

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  const handleSubmit = async () => {
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    fd.append('autoDetectType', String(autoDetect))
    if (!autoDetect && documentType) fd.append('documentType', documentType)

    const doc = await upload.mutateAsync(fd)
    if (autoProcess) {
      await process.mutateAsync(doc.id)
    }
    onClose()
    setFile(null)
  }

  const isPending = upload.isPending || process.isPending

  return (
    <Modal open={open} onClose={onClose} title={t('ocr.uploadDocument')}>
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
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp,.webp"
            className="hidden"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div>
              <p className="text-sm font-medium text-gray-800">{file.name}</p>
              <p className="text-xs text-gray-400 mt-1">{fmtSize(file.size)}</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500">Drop a file here, or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">PDF, PNG, JPG, TIFF, BMP, WebP</p>
            </div>
          )}
        </div>

        {/* Document type toggle */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoDetect}
              onChange={e => setAutoDetect(e.target.checked)}
              className="rounded border-gray-300 text-brand-600"
            />
            <span className="text-sm text-gray-700">{t('ocr.autoDetectType')}</span>
          </label>
        </div>

        {!autoDetect && (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">{t('ocr.documentType')}</label>
            <select
              value={documentType}
              onChange={e => setDocumentType(e.target.value as OcrDocumentType)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">— Select type —</option>
              {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        )}

        {/* Auto-process toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoProcess}
            onChange={e => setAutoProcess(e.target.checked)}
            className="rounded border-gray-300 text-brand-600"
          />
          <span className="text-sm text-gray-700">{t('ocr.processAfterUpload')}</span>
        </label>

        {upload.isError && <p className="text-sm text-red-600">{errorMessage(upload.error)}</p>}
        {process.isError && <p className="text-sm text-red-600">{errorMessage(process.error)}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onClose} disabled={isPending}>{t('common.cancel')}</Button>
        <Button onClick={handleSubmit} disabled={!file || isPending}>
          {isPending ? t('common.loading') : t('ocr.upload')}
        </Button>
      </div>
    </Modal>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OcrPage() {
  const { t }              = useTranslation()
  const [showUpload, setShowUpload] = useState(false)
  const [page, setPage]    = useState(0)
  const { data, isLoading } = useOcrDocuments(page)
  const process            = useProcessDocument()

  const docs  = data?.items  ?? []
  const total = data?.total  ?? 0

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title={t('ocr.title')}
        subtitle={`${total} ${t('ocr.documents')}`}
        actions={
          <>
            <Link to="/ocr/config">
              <Button variant="secondary" size="sm">{t('ocr.settings')}</Button>
            </Link>
            <Link to="/ocr/metrics">
              <Button variant="secondary" size="sm">{t('ocr.metricsNav')}</Button>
            </Link>
            <Button size="sm" onClick={() => setShowUpload(true)}>
              + {t('ocr.uploadDocument')}
            </Button>
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
            <Button size="sm" className="mt-4" onClick={() => setShowUpload(true)}>
              {t('ocr.uploadFirst')}
            </Button>
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
                    <Link to={`/ocr/${doc.id}`} className="font-medium text-brand-700 hover:underline">
                      {doc.fileName}
                    </Link>
                    {doc.autoDetectType && (
                      <span className="ml-2 text-xs text-gray-400">(auto-detect)</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-gray-600">
                    {doc.documentType
                      ? DOC_TYPES.find(t => t.value === doc.documentType)?.label ?? doc.documentType
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="py-2 pr-4">{statusBadge(doc.status)}</td>
                  <td className="py-2 pr-4 text-gray-500 tabular-nums">{fmtSize(doc.fileSizeBytes)}</td>
                  <td className="py-2 pr-4 text-gray-500">
                    {format(new Date(doc.createdAt), 'dd/MM/yyyy HH:mm')}
                  </td>
                  <td className="py-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {doc.status !== 'processing' && (
                      <button
                        className="text-xs text-brand-600 hover:underline"
                        onClick={() => process.mutate(doc.id)}
                        disabled={process.isPending}
                      >
                        {doc.status === 'completed' ? 'Re-process' : 'Process'}
                      </button>
                    )}
                    <Link to={`/ocr/${doc.id}`} className="text-xs text-gray-500 hover:text-gray-700">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {total > 50 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="disabled:opacity-40 hover:text-gray-700"
            >
              ← Prev
            </button>
            <span>Page {page + 1} of {Math.ceil(total / 50)}</span>
            <button
              disabled={(page + 1) * 50 >= total}
              onClick={() => setPage(p => p + 1)}
              className="disabled:opacity-40 hover:text-gray-700"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} />
    </div>
  )
}
