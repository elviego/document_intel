import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { errorMessage } from '@/lib/api-client'
import { useOcrDocument, useProcessDocument } from './hooks/useOcr'
import type { OcrStatus } from './hooks/useOcr'
import { OcrResultViewer } from './components/OcrResultViewer'
import { ConfidenceBadge } from './components/ConfidenceBadge'

const STATUS_VARIANT: Record<OcrStatus, 'gray' | 'blue' | 'green' | 'red'> = {
  pending:    'gray',
  processing: 'blue',
  completed:  'green',
  failed:     'red',
} as any

function fmtSize(bytes: number) {
  if (bytes < 1024)         return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function OcrDocumentPage() {
  const { id }       = useParams<{ id: string }>()
  const { t }        = useTranslation()
  const { data, isLoading, isError } = useOcrDocument(id!)
  const process      = useProcessDocument()

  if (isLoading) return <p className="p-8 text-sm text-gray-400">{t('common.loading')}</p>
  if (isError || !data)  return <p className="p-8 text-sm text-red-500">Document not found.</p>

  const { document: doc, job } = data
  const isProcessing = doc.status === 'processing' || doc.status === 'pending'

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
              size="sm"
              onClick={() => process.mutate(doc.id)}
              disabled={process.isPending || isProcessing}
            >
              {isProcessing ? t('common.loading') : job ? t('ocr.reProcess') : t('ocr.process')}
            </Button>
          </>
        }
      />

      <div className="flex-1 overflow-auto px-8 pb-8 space-y-6">
        {process.isError && (
          <p className="text-sm text-red-600">{errorMessage(process.error)}</p>
        )}

        {/* Document info */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoCard label={t('ocr.status')}>
            <Badge variant={STATUS_VARIANT[doc.status]}>{doc.status}</Badge>
          </InfoCard>
          <InfoCard label={t('ocr.documentType')}>
            {doc.documentType ?? <span className="text-gray-400">—</span>}
          </InfoCard>
          <InfoCard label={t('ocr.detection')}>
            {doc.autoDetectType ? 'Auto' : 'Manual'}
          </InfoCard>
          <InfoCard label={t('ocr.pages')}>
            {doc.pageCount ?? '—'}
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
              {job.metadata.llm.model}
            </InfoCard>
          )}
        </section>

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

        {/* Result */}
        {job && doc.status === 'completed' && (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">{t('ocr.results')}</h2>
            <OcrResultViewer job={job} />
          </section>
        )}

        {!job && doc.status === 'pending' && !isProcessing && (
          <div className="text-center py-12 text-sm text-gray-500">
            <p>{t('ocr.notYetProcessed')}</p>
            <Button size="sm" className="mt-3" onClick={() => process.mutate(doc.id)}>
              {t('ocr.process')}
            </Button>
          </div>
        )}
      </div>
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
