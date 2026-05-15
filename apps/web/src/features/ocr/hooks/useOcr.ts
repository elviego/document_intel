import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export type OcrDocumentType =
  | 'invoice' | 'receipt' | 'contract' | 'id_document'
  | 'medical' | 'bank_statement' | 'form' | 'other'

export type OcrStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface OcrDocument {
  id:             string
  fileName:       string
  fileSizeBytes:  number
  mimeType:       string
  pageCount:      number | null
  documentType:   OcrDocumentType | null
  autoDetectType: boolean
  status:         OcrStatus
  createdAt:      string
  updatedAt:      string
}

export interface OcrPageResult {
  pageNumber: number
  confidence: number
  wordCount:  number
  rawText:    string
}

export interface OcrResultMetadata {
  $schema:     string
  documentId:  string
  jobId:       string
  processedAt: string
  source:      { fileName: string; mimeType: string; fileSizeBytes: number; pageCount: number }
  detection:   { documentType: OcrDocumentType; autoDetected: boolean; detectionConfidence: number | null }
  ocr: {
    engine: string; engineVersion: string | null; language: string
    processingTimeMs: number; overallConfidence: number; pages: OcrPageResult[]
  }
  llm: { provider: string; model: string; processingTimeMs: number; tokensUsed: number } | null
  structuredData: Record<string, unknown> | null
  validation:     { status: string; issues: string[] }
}

export interface OcrJob {
  id: string; documentId: string; status: OcrStatus; ocrEngine: string
  rawText: string | null; metadata: OcrResultMetadata | null
  errorMessage: string | null; createdAt: string; completedAt: string | null
}

export interface OcrMetric {
  id: string; jobId: string; documentId: string
  overallConfidence: number | null; pageConfidences: number[] | null
  characterCount: number | null; wordCount: number | null
  processingTimeMs: number; ocrEngine: string; ocrEngineVersion: string | null
  llmModel: string | null; llmProvider: string | null; llmTokensUsed: number | null
  documentType: OcrDocumentType | null; autoDetectedType: boolean | null; createdAt: string
}

export interface MetricsAggregate {
  totalDocuments: number; avgConfidence: number | null; avgProcessingMs: number | null
  byEngine: { engine: string; count: number }[]
  byDocType: { documentType: string; count: number }[]
  byLlmModel: { model: string; count: number }[]
}

export interface TrendingPoint {
  date: string; avgConfidence: number | null; count: number; avgProcessingMs: number | null
}

// ── Queries ──────────────────────────────────────────────────────────────────

export function useOcrDocuments(page = 0) {
  return useQuery({
    queryKey: ['ocr-documents', page],
    queryFn:  () => apiClient.get<{ items: OcrDocument[]; total: number }>(
      `/v1/ocr/documents?limit=50&offset=${page * 50}`
    ),
    refetchInterval: (query) => {
      const hasActive = (query.state.data?.items ?? [])
        .some(d => d.status === 'pending' || d.status === 'processing')
      return hasActive ? 3000 : false
    },
  })
}

export function useOcrDocument(id: string) {
  return useQuery({
    queryKey: ['ocr-document', id],
    queryFn:  () => apiClient.get<{ document: OcrDocument; job: OcrJob | null }>(`/v1/ocr/documents/${id}`),
    enabled:  !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.document.status
      return status === 'pending' || status === 'processing' ? 3000 : false
    },
  })
}

export function useOcrDocumentJobs(docId: string) {
  return useQuery({
    queryKey: ['ocr-document-jobs', docId],
    queryFn:  () => apiClient.get<OcrJob[]>(`/v1/ocr/documents/${docId}/jobs`),
    enabled:  !!docId,
    refetchInterval: (query) => {
      const jobs = query.state.data ?? []
      return jobs.some(j => j.status === 'pending' || j.status === 'processing') ? 3000 : false
    },
  })
}

export function useOcrMetricsAggregate() {
  return useQuery({
    queryKey: ['ocr-metrics-aggregate'],
    queryFn:  () => apiClient.get<MetricsAggregate>('/v1/ocr/documents/metrics/aggregate'),
  })
}

export function useOcrMetricsList(opts?: { documentId?: string }) {
  return useQuery({
    queryKey: ['ocr-metrics-list', opts],
    queryFn:  () => {
      const p = new URLSearchParams({ limit: '100' })
      if (opts?.documentId) p.set('documentId', opts.documentId)
      return apiClient.get<OcrMetric[]>(`/v1/ocr/documents/metrics/list?${p}`)
    },
  })
}

export function useOcrMetricsTrending(days = 30, documentType?: OcrDocumentType) {
  return useQuery({
    queryKey: ['ocr-metrics-trending', days, documentType],
    queryFn:  () => {
      const p = new URLSearchParams({ days: String(days) })
      if (documentType) p.set('documentType', documentType)
      return apiClient.get<TrendingPoint[]>(`/v1/ocr/documents/metrics/trending?${p}`)
    },
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useUploadDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) => apiClient.postForm<OcrDocument>('/v1/ocr/documents', formData),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['ocr-documents'] }),
  })
}

export function useBatchUpload() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient.postForm<{ results: { fileName: string; id?: string; error?: string }[] }>(
        '/v1/ocr/documents/batch', formData
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ocr-documents'] }),
  })
}

export function useProcessDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, override }: { id: string; override?: { documentType?: OcrDocumentType; llmProviderId?: string; llmModel?: string } }) =>
      apiClient.post<{ documentId: string; status: string }>(`/v1/ocr/documents/${id}/process`, override ?? {}),
    onSuccess: (_data, { id }) => {
      // Invalidate immediately so the list sees 'processing' and starts polling
      qc.invalidateQueries({ queryKey: ['ocr-documents'] })
      qc.invalidateQueries({ queryKey: ['ocr-document', id] })
    },
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/v1/ocr/documents/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['ocr-documents'] }),
  })
}

export const VITE_API_URL = (import.meta as any).env?.VITE_API_URL ?? ''

export function documentFileUrl(id: string) {
  return `${VITE_API_URL}/v1/ocr/documents/${id}/file`
}

export function documentExportUrl(id: string, format: 'json' | 'csv') {
  return `${VITE_API_URL}/v1/ocr/documents/${id}/export?format=${format}`
}
