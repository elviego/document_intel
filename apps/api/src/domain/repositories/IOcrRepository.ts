import type {
  OcrDocument, OcrDocumentType, OcrJob, OcrMetric,
  LlmProvider, OcrDocumentConfig, OcrResultMetadata, OcrStatus,
} from '../entities/OcrDocument.js'

export interface CreateDocumentInput {
  fileName:       string
  filePath:       string
  fileSizeBytes:  number
  mimeType:       string
  pageCount?:     number
  documentType?:  OcrDocumentType
  autoDetectType: boolean
  uploadedBy?:    string
}

export interface CreateJobInput {
  documentId:       string
  ocrEngine:        string
  ocrEngineVersion?: string
  llmProviderId?:   string
  llmModel?:        string
}

export interface UpdateJobInput {
  status:           OcrStatus
  rawText?:         string
  metadata?:        OcrResultMetadata
  errorMessage?:    string
  startedAt?:       Date
  completedAt?:     Date
  ocrEngineVersion?: string
  llmModel?:        string
}

export interface CreateMetricInput {
  jobId:             string
  documentId:        string
  overallConfidence: number | null
  pageConfidences:   number[] | null
  characterCount:    number | null
  wordCount:         number | null
  processingTimeMs:  number
  ocrEngine:         string
  ocrEngineVersion?: string
  llmModel?:         string
  llmProvider?:      string
  llmTokensUsed?:    number
  documentType?:     OcrDocumentType
  autoDetectedType?: boolean
}

export interface IOcrRepository {
  // Documents
  createDocument(input: CreateDocumentInput): Promise<OcrDocument>
  findDocumentById(id: string): Promise<OcrDocument | null>
  listDocuments(opts?: { limit?: number; offset?: number; status?: OcrStatus; documentType?: OcrDocumentType }): Promise<{ items: OcrDocument[]; total: number }>
  updateDocumentStatus(id: string, status: OcrStatus, documentType?: OcrDocumentType, pageCount?: number): Promise<void>

  // Jobs
  createJob(input: CreateJobInput): Promise<OcrJob>
  findJobById(id: string): Promise<OcrJob | null>
  findLatestJobForDocument(documentId: string): Promise<OcrJob | null>
  updateJob(id: string, input: UpdateJobInput): Promise<void>

  // Metrics
  createMetric(input: CreateMetricInput): Promise<OcrMetric>
  listMetrics(opts?: { limit?: number; offset?: number; documentId?: string }): Promise<OcrMetric[]>
  metricsAggregate(): Promise<{
    totalDocuments: number
    avgConfidence:  number | null
    avgProcessingMs: number | null
    byEngine:       { engine: string; count: number }[]
    byDocType:      { documentType: string; count: number }[]
    byLlmModel:     { model: string; count: number }[]
  }>

  // LLM Providers
  listProviders(): Promise<LlmProvider[]>
  findProviderById(id: string): Promise<LlmProvider | null>
  findDefaultProvider(): Promise<LlmProvider | null>
  createProvider(input: Omit<LlmProvider, 'id' | 'createdAt' | 'updatedAt'>): Promise<LlmProvider>
  updateProvider(id: string, input: Partial<Omit<LlmProvider, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LlmProvider>
  deleteProvider(id: string): Promise<void>
  setDefaultProvider(id: string): Promise<void>

  // Configs
  listConfigs(): Promise<OcrDocumentConfig[]>
  findConfigByType(documentType: OcrDocumentType): Promise<OcrDocumentConfig | null>
  upsertConfig(documentType: OcrDocumentType, input: Partial<Omit<OcrDocumentConfig, 'id' | 'documentType' | 'createdAt' | 'updatedAt'>>): Promise<OcrDocumentConfig>
}
