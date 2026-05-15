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
  useOcrDocument, useOcrDocumentJobs, useProcessDocument, useCancelProcessing,
  documentFileUrl, documentExportUrl,
} from './hooks/useOcr'
import type { OcrDocumentType, OcrJob, OcrStatus } from './hooks/useOcr'
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

// ── Processing history ────────────────────────────────────────────────────────

const STATUS_DOT: Record<OcrStatus, string> = {
  completed: 'bg-emerald-500',
  failed:    'bg-red-400',
  processing:'bg-blue-400 animate-pulse',
  pending:   'bg-gray-300',
}

function fmtDuration(job: OcrJob): string {
  if (!job.startedAt || !job.completedAt) return '—'
  const ms = new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

function dateLabel(iso: string): string {
  const d    = new Date(iso)
  const now  = new Date()
  const diff = Math.floor((now.setHours(0,0,0,0) - new Date(d).setHours(0,0,0,0)) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return format(d, 'dd MMM yyyy')
}

function ProcessingHistory({ jobs }: { jobs: OcrJob[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [collapsed,  setCollapsed]  = useState<Record<string, boolean>>({})

  // Auto-open the latest run once jobs load (they arrive async)
  useEffect(() => {
    if (jobs.length > 0) setExpandedId(id => id ?? jobs[0].id)
  }, [jobs[0]?.id])

  if (jobs.length === 0) return null

  // Group by calendar date
  const groups: { label: string; jobs: OcrJob[] }[] = []
  for (const job of jobs) {
    const label = dateLabel(job.createdAt)
    const last  = groups[groups.length - 1]
    if (last?.label === label) last.jobs.push(job)
    else groups.push({ label, jobs: [job] })
  }

  const toggleDate = (label: string) =>
    setCollapsed(c => ({ ...c, [label]: !c[label] }))

  const toggleJob = (id: string) =>
    setExpandedId(prev => prev === id ? null : id)

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Processing History
        </h2>
        <span className="text-[11px] text-gray-300 font-mono">{jobs.length} run{jobs.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="border border-gray-100 rounded-lg overflow-hidden divide-y divide-gray-100">
        {groups.map(({ label, jobs: groupJobs }, gi) => {
          const isDateOpen = !collapsed[label]
          return (
            <div key={label}>
              {/* Date header */}
              <button
                onClick={() => toggleDate(label)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-gray-400">{groupJobs.length} run{groupJobs.length !== 1 ? 's' : ''}</span>
                  <span className="text-gray-300 text-[10px]">{isDateOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {isDateOpen && (
                <div className="divide-y divide-gray-50">
                  {groupJobs.map((job, ji) => {
                    const isExpanded = expandedId === job.id
                    const isLatest   = gi === 0 && ji === 0
                    const conf       = job.metadata?.ocr.overallConfidence
                    return (
                      <div key={job.id} className={`border-l-2 transition-colors ${isExpanded ? 'border-brand-400' : 'border-transparent'}`}>
                        {/* Row header — click to expand/collapse */}
                        <button
                          onClick={() => toggleJob(job.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-left text-xs transition-colors ${
                            isExpanded ? 'bg-brand-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          {/* Chevron */}
                          <span className={`text-gray-300 text-[10px] shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>

                          {/* Time */}
                          <span className="font-mono text-gray-400 tabular-nums w-10 shrink-0">
                            {format(new Date(job.createdAt), 'HH:mm')}
                          </span>

                          {/* Status dot */}
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[job.status]}`} />

                          {/* Engine */}
                          <span className="text-gray-500 font-mono truncate flex-1">
                            {job.ocrEngine}
                            {job.metadata?.llm && (
                              <span className="text-gray-300"> · {job.metadata.llm.model}</span>
                            )}
                          </span>

                          {/* Confidence */}
                          {conf != null ? (
                            <span className={`tabular-nums font-mono w-10 text-right shrink-0 ${
                              conf >= 0.8 ? 'text-emerald-500' : conf >= 0.5 ? 'text-amber-500' : 'text-red-400'
                            }`}>
                              {(conf * 100).toFixed(0)}%
                            </span>
                          ) : (
                            <span className="w-10 text-right text-gray-300 shrink-0">—</span>
                          )}

                          {/* Duration */}
                          <span className="text-gray-300 font-mono tabular-nums w-12 text-right shrink-0">
                            {fmtDuration(job)}
                          </span>

                          {/* Latest badge */}
                          {isLatest && (
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-brand-500 bg-brand-50 border border-brand-100 px-1.5 py-0.5 rounded shrink-0">
                              latest
                            </span>
                          )}
                        </button>

                        {/* Expanded content */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 bg-white border-t border-gray-50">
                            {job.status === 'completed' && job.metadata
                              ? <OcrResultViewer job={job} />
                              : job.status === 'failed'
                                ? <p className="text-xs text-red-500 py-2">{job.errorMessage ?? 'Processing failed'}</p>
                                : <p className="text-xs text-gray-400 py-2">No results available</p>
                            }
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
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
  const { data: jobs = [] }          = useOcrDocumentJobs(id!)
  const process = useProcessDocument()
  const cancel  = useCancelProcessing()
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

            {isProcessing && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => cancel.mutate(doc.id)}
                disabled={cancel.isPending}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                {cancel.isPending ? 'Stopping…' : 'Stop'}
              </Button>
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

          {/* Processing history */}
          <ProcessingHistory jobs={jobs} />

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
