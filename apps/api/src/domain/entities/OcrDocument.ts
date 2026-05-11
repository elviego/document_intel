export type OcrDocumentType =
  | 'invoice' | 'receipt' | 'contract' | 'id_document'
  | 'medical' | 'bank_statement' | 'form' | 'other'

export type OcrStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type LlmProviderType = 'openai' | 'anthropic' | 'ollama' | 'deepseek' | 'custom'

// ─── Core result metadata (industry standard, loosely based on W3C Annotation + ISO/TS 8000) ─────
export interface OcrPageResult {
  pageNumber: number
  confidence: number    // 0-1
  wordCount:  number
  rawText:    string
}

export interface OcrResultMetadata {
  $schema:     string  // 'ocr-result/v1'
  documentId:  string
  jobId:       string
  processedAt: string
  source: {
    fileName:      string
    mimeType:      string
    fileSizeBytes: number
    pageCount:     number
  }
  detection: {
    documentType:        OcrDocumentType
    autoDetected:        boolean
    detectionConfidence: number | null
  }
  ocr: {
    engine:            string
    engineVersion:     string | null
    language:          string
    processingTimeMs:  number
    overallConfidence: number
    pages:             OcrPageResult[]
  }
  llm: {
    provider:         string | null
    model:            string | null
    processingTimeMs: number
    tokensUsed:       number
  } | null
  structuredData: Record<string, unknown> | null
  validation: {
    status: 'valid' | 'needs_review' | 'failed'
    issues: string[]
  }
}

export interface OcrDocument {
  id:             string
  fileName:       string
  filePath:       string
  fileSizeBytes:  number
  mimeType:       string
  pageCount:      number | null
  documentType:   OcrDocumentType | null
  autoDetectType: boolean
  status:         OcrStatus
  uploadedBy:     string | null
  createdAt:      Date
  updatedAt:      Date
}

export interface OcrJob {
  id:               string
  documentId:       string
  status:           OcrStatus
  ocrEngine:        string
  ocrEngineVersion: string | null
  llmProviderId:    string | null
  llmModel:         string | null
  rawText:          string | null
  metadata:         OcrResultMetadata | null
  errorMessage:     string | null
  startedAt:        Date | null
  completedAt:      Date | null
  createdAt:        Date
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
  createdAt:         Date
}

export interface LlmProvider {
  id:           string
  name:         string
  providerType: LlmProviderType
  baseUrl:      string | null
  apiKey:       string | null
  defaultModel: string
  isActive:     boolean
  isDefault:    boolean
  config:       Record<string, unknown> | null
  createdAt:    Date
  updatedAt:    Date
}

export interface OcrWebhook {
  id:        string
  name:      string
  url:       string
  secret:    string | null
  events:    string[]
  isActive:  boolean
  createdAt: Date
  updatedAt: Date
}

export interface OcrDocumentConfig {
  id:                   string
  documentType:         OcrDocumentType
  ocrEngine:            string
  ocrLanguage:          string
  ocrDpi:               number | null
  preprocessingEnabled: boolean
  llmProviderId:        string | null
  llmModel:             string | null
  llmPromptTemplate:    string | null
  structuredSchema:     Record<string, unknown> | null
  createdAt:            Date
  updatedAt:            Date
}
