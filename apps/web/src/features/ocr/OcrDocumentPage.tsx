import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { errorMessage } from '@/lib/api-client'
import {
  useOcrDocument, useProcessDocument,
  documentFileUrl, documentExportUrl,
} from './hooks/useOcr'
import type { OcrDocumentType, OcrStatus } from './hooks/useOcr'
import { useLlmProviders } from './hooks/useOcrConfig'
import { OcrResultViewer } from './components/OcrResultViewer'
import { ConfidenceBadge } from './components/ConfidenceBadge'
import { DOC_TYPES } from './OcrPage'

const STATUS_VARIANT: Record<OcrStatus, 'gray' | 'blue' | 'green' | 'red'> = {
  pending: 'gray', processing: 'blue', completed: 'green', failed: 'red',
} as any

function fmtSize(bytes: number) {
  if (bytes < 1024)         return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ── Authenticated file fetch + blob URL ───────────────────────────────────────

function usePreviewUrl(docId: string, mimeType: string) {
  const [url, setUrl]   = useState<string | null>(null)
  const [err, setErr]   = useState(false)

  useEffect(() => {
    let objectUrl: string | null = null
    const token = localStorage.getItem('access_token')

    fetch(documentFileUrl(docId), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.blob()
      })
      .then(blob => {
        objectUrl = URL.createObjectURL(new Blob([blob], { type: mimeType }))
        setUrl(objectUrl)
      })
      .catch(() => setErr(true))

    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [docId, mimeType])

  return { url, err }
}

// ── Preview panel ─────────────────────────────────────────────────────────────

function PreviewPanel({ docId, mimeType, fileName }: { docId: string; mimeType: string; fileName: string }) {
  const { url, err } = usePreviewUrl(docId, mimeType)
  const isImage = mimeType.startsWith('image/')
  const isPdf   = mimeType === 'application/pdf'

  if (err) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
        Preview unavailable
      </div>
    )
  }

  if (!url) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-brand-600 rounded-full" />
      </div>
    )
  }

  if (isImage) {
    return (
      <img
        src={url}
        alt={fileName}
        className="absolute inset-0 w-full h-full object-contain p-3"
      />
    )
  }

  if (isPdf) {
    return (
      <iframe
        src={url}
        title={fileName}
        className="absolute inset-0 w-full h-full border-0"
      />
    )
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-gray-500">
      <span className="text-4xl">📄</span>
      <a href={url} download={fileName} className="text-brand-600 hover:underline">
        Download to view
      </a>
    </div>
  )
}

// ── Re-process override modal ─────────────────────────────────────────────────

function OverrideModal({
  open, onClose, docId, currentType,
}: {
  open: boolean
  onClose: () => void
  docId: string
  currentType: OcrDocumentType | null
}) {
  const { t } = useTranslation()
  const process = useProcessDocument()
  const { data: providers = [] } = useLlmProviders()

  const [docType,    setDocType]    = useState<OcrDocumentType | ''>(currentType ?? '')
  const [providerId, setProviderId] = useState('')
  const [model,      setModel]      = useState('')

  const handleSubmit = async () => {
    await process.mutateAsync({
      id: docId,
      override: {
        documentType:  docType  || undefined,
        llmProviderId: providerId || undefined,
        llmModel:      model      || undefined,
      },
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Re-process with override">
      <div className="space-y-4 text-sm">
        <div className="space-y-1">
          <label className="block font-medium text-gray-700">Document type override</label>
          <select
            value={docType}
            onChange={e => setDocType(e.target.value as OcrDocumentType)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">— Keep current ({currentType ?? 'auto'}) —</option>
            {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block font-medium text-gray-700">LLM provider override</label>
          <select
            value={providerId}
            onChange={e => setProviderId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">— Use configured default —</option>
            {providers.filter(p => p.isActive).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block font-medium text-gray-700">Model override</label>
          <input
            type="text"
            value={model}
            onChange={e => setModel(e.target.value)}
            placeholder="Leave blank to use provider default"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {process.isError && (
          <p className="text-red-600 text-xs">{errorMessage(process.error)}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onClose} disabled={process.isPending}>
          {t('common.cancel')}
        </Button>
        <Button onClick={handleSubmit} disabled={process.isPending}>
          {process.isPending ? t('common.loading') : 'Re-process'}
        </Button>
      </div>
    </Modal>
  )
}

// ── Authenticated download helper ─────────────────────────────────────────────

async function downloadExport(docId: string, fmt: 'json' | 'csv', fileName: string) {
  const token = localStorage.getItem('access_token')
  const res = await fetch(documentExportUrl(docId, fmt), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) return
  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${fileName.replace(/\.[^.]+$/, '')}-ocr.${fmt}`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OcrDocumentPage() {
  const { id } = useParams<{ id: string }>()
  const { t }  = useTranslation()
  const { data, isLoading, isError } = useOcrDocument(id!)
  const process = useProcessDocument()
  const [showOverride,  setShowOverride]  = useState(false)
  const [showPreview,   setShowPreview]   = useState(true)

  if (isLoading) return <p className="p-8 text-sm text-gray-400">{t('common.loading')}</p>
  if (isError || !data) return <p className="p-8 text-sm text-red-500">Document not found.</p>

  const { document: doc, job } = data
  const isProcessing = doc.status === 'processing' || doc.status === 'pending'
  const canExport    = doc.status === 'completed' && !!job?.metadata

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title={doc.fileName}
        subtitle={`${fmtSize(doc.fileSizeBytes)} · ${doc.mimeType}`}
        actions={
          <>
            <Link to="/ocr">
              <Button variant="secondary" size="sm">← {t('ocr.back')}</Button>
            </Link>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowPreview(p => !p)}
            >
              {showPreview ? 'Hide preview' : 'Show preview'}
            </Button>

            {canExport && (
              <>
                <Button variant="secondary" size="sm" onClick={() => downloadExport(doc.id, 'json', doc.fileName)}>
                  Export JSON
                </Button>
                <Button variant="secondary" size="sm" onClick={() => downloadExport(doc.id, 'csv', doc.fileName)}>
                  Export CSV
                </Button>
              </>
            )}

            {job ? (
              <Button size="sm" onClick={() => setShowOverride(true)} disabled={isProcessing}>
                {isProcessing ? t('common.loading') : t('ocr.reProcess')}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => process.mutate({ id: doc.id })}
                disabled={process.isPending || isProcessing}
              >
                {isProcessing ? t('common.loading') : t('ocr.process')}
              </Button>
            )}
          </>
        }
      />

      <div className="flex-1 overflow-hidden flex">
        {/* Preview panel */}
        {showPreview && (
          <div className="w-[27.6rem] shrink-0 border-r border-gray-200 flex flex-col bg-gray-50">
            <div className="px-4 py-2 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Preview
            </div>
            <div className="flex-1 relative overflow-hidden">
              <PreviewPanel docId={doc.id} mimeType={doc.mimeType} fileName={doc.fileName} />
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 overflow-auto px-8 py-6 space-y-6">
          {process.isError && (
            <p className="text-sm text-red-600">{errorMessage(process.error)}</p>
          )}

          {/* Metadata cards */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InfoCard label={t('ocr.status')}>
              <Badge variant={STATUS_VARIANT[doc.status]}>{doc.status}</Badge>
            </InfoCard>
            <InfoCard label={t('ocr.documentType')}>
              {doc.documentType
                ? DOC_TYPES.find(d => d.value === doc.documentType)?.label ?? doc.documentType
                : <span className="text-gray-400">—</span>}
            </InfoCard>
            <InfoCard label={t('ocr.detection')}>
              {doc.autoDetectType ? 'Auto' : 'Manual'}
            </InfoCard>
            <InfoCard label={t('ocr.pages')}>
              {doc.pageCount ?? '—'}
            </InfoCard>
            <InfoCard label={t('ocr.size')}>
              {fmtSize(doc.fileSizeBytes)}
            </InfoCard>
            <InfoCard label={t('ocr.uploadedAt')}>
              {format(new Date(doc.createdAt), 'dd/MM/yyyy HH:mm')}
            </InfoCard>
            {job?.completedAt && (
              <InfoCard label={t('ocr.processedAt')}>
                {format(new Date(job.completedAt), 'dd/MM/yyyy HH:mm')}
              </InfoCard>
            )}
            {job?.metadata && (
              <InfoCard label={t('ocr.confidence')}>
                <ConfidenceBadge value={job.metadata.ocr.overallConfidence} />
              </InfoCard>
            )}
            {job?.metadata?.llm && (
              <InfoCard label={t('ocr.llmModel')}>
                <span className="text-xs">{job.metadata.llm.model}</span>
              </InfoCard>
            )}
          </section>

          {/* Processing indicator */}
          {isProcessing && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              {t('ocr.processingMessage')}
            </div>
          )}

          {/* Error */}
          {doc.status === 'failed' && job?.errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <strong>{t('ocr.processingFailed')}:</strong> {job.errorMessage}
            </div>
          )}

          {/* Results */}
          {job && doc.status === 'completed' && (
            <section>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">{t('ocr.results')}</h2>
              <OcrResultViewer job={job} />
            </section>
          )}

          {/* Not yet processed */}
          {!job && doc.status === 'pending' && !isProcessing && (
            <div className="text-center py-12 text-sm text-gray-500">
              <p>{t('ocr.notYetProcessed')}</p>
              <Button size="sm" className="mt-3" onClick={() => process.mutate({ id: doc.id })}>
                {t('ocr.process')}
              </Button>
            </div>
          )}
        </div>
      </div>

      <OverrideModal
        open={showOverride}
        onClose={() => setShowOverride(false)}
        docId={doc.id}
        currentType={doc.documentType}
      />
    </div>
  )
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm font-medium text-gray-800">{children}</div>
    </div>
  )
}
