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
    engine:            string
    engineVersion:     string | null
    language:          string
    processingTimeMs:  number
    overallConfidence: number
    pages:             OcrPageResult[]
  }
  llm: { provider: string; model: string; processingTimeMs: number; tokensUsed: number } | null
  structuredData: Record<string, unknown> | null
  validation:     { status: string; issues: string[] }
}

export interface OcrJob {
  id:               string
  documentId:       string
  status:           OcrStatus
  ocrEngine:        string
  rawText:          string | null
  metadata:         OcrResultMetadata | null
  errorMessage:     string | null
  createdAt:        string
  completedAt:      string | null
}

export interface OcrMetric {
  id:                string
  jobId:             string
  documentId:        string
  overallConfidence: number | null
  pageConfidences:   number[] | null
  characterCount:    number | null
  wordCount:         number | null
  processingTimeMs:  number
  ocrEngine:         string
  ocrEngineVersion:  string | null
  llmModel:          string | null
  llmProvider:       string | null
  llmTokensUsed:     number | null
  documentType:      OcrDocumentType | null
  autoDetectedType:  boolean | null
  createdAt:         string
}

export interface MetricsAggregate {
  totalDocuments:  number
  avgConfidence:   number | null
  avgProcessingMs: number | null
  byEngine:        { engine: string; count: number }[]
  byDocType:       { documentType: string; count: number }[]
  byLlmModel:      { model: string; count: number }[]
}

// ── Queries ──────────────────────────────────────────────────────────────────

export function useOcrDocuments(page = 0) {
  return useQuery({
    queryKey: ['ocr-documents', page],
    queryFn: () => apiClient.get<{ items: OcrDocument[]; total: number }>(
      `/v1/ocr/documents?limit=50&offset=${page * 50}`
    ),
  })
}

export function useOcrDocument(id: string) {
  return useQuery({
    queryKey: ['ocr-document', id],
    queryFn: () => apiClient.get<{ document: OcrDocument; job: OcrJob | null }>(`/v1/ocr/documents/${id}`),
    enabled:  !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.document.status
      return status === 'pending' || status === 'processing' ? 3000 : false
    },
  })
}

export function useOcrMetricsAggregate() {
  return useQuery({
    queryKey: ['ocr-metrics-aggregate'],
    queryFn: () => apiClient.get<MetricsAggregate>('/v1/ocr/documents/metrics/aggregate'),
  })
}

export function useOcrMetricsList(opts?: { documentId?: string }) {
  return useQuery({
    queryKey: ['ocr-metrics-list', opts],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '100' })
      if (opts?.documentId) params.set('documentId', opts.documentId)
      return apiClient.get<OcrMetric[]>(`/v1/ocr/documents/metrics/list?${params}`)
    },
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useUploadDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient.postForm<OcrDocument>('/v1/ocr/documents', formData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ocr-documents'] }),
  })
}

export function useProcessDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<OcrResultMetadata>(`/v1/ocr/documents/${id}/process`, {}),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['ocr-documents'] })
      qc.invalidateQueries({ queryKey: ['ocr-document', id] })
      qc.invalidateQueries({ queryKey: ['ocr-metrics-aggregate'] })
    },
  })
}
