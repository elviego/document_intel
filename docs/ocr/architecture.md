# Architecture

## Design Principles

The OCR module follows the same **Clean Architecture / DDD** conventions as the rest of the platform:

- **Domain layer** owns entities and repository interfaces — no framework dependencies
- **Application layer** contains use-case classes that orchestrate domain objects
- **Infrastructure layer** provides concrete implementations (DB, storage, engines, LLM adapters, HTTP)
- Dependencies point inward: infrastructure depends on application, application depends on domain

---

## Directory Structure

```
apps/api/src/
├── domain/
│   ├── entities/
│   │   └── OcrDocument.ts          # All OCR domain types & interfaces
│   └── repositories/
│       └── IOcrRepository.ts       # Pure repository interface (no Drizzle)
│
├── application/
│   └── use-cases/ocr/
│       ├── UploadDocument.ts       # Validate → store → persist
│       └── ProcessDocument.ts      # OCR → LLM → metrics → webhooks
│
└── infrastructure/
    ├── db/
    │   └── schema.ts               # Drizzle table definitions (all OCR tables)
    ├── repositories/
    │   └── OcrRepository.ts        # IOcrRepository implemented with Drizzle
    ├── storage/
    │   ├── IFileStorage.ts         # Storage interface
    │   ├── LocalFileStorage.ts     # Filesystem adapter
    │   ├── S3FileStorage.ts        # AWS SDK v3 adapter (S3/R2/MinIO)
    │   └── FileStorageFactory.ts   # Singleton — reads STORAGE_PROVIDER env
    ├── ocr/
    │   ├── IOcrEngine.ts           # OCR engine interface
    │   ├── TesseractEngine.ts      # Image OCR (tesseract.js)
    │   ├── PdfExtractor.ts         # PDF OCR (pdfjs-dist ± tesseract)
    │   └── OcrEngineFactory.ts     # Selects engine by MIME type
    ├── llm/
    │   ├── ILlmProvider.ts         # LLM provider interface
    │   ├── AnthropicProvider.ts    # @anthropic-ai/sdk adapter
    │   ├── OpenAiCompatibleProvider.ts  # openai SDK adapter
    │   ├── LlmProviderFactory.ts   # Builds provider from DB record
    │   └── StructuredExtractor.ts  # Detection + extraction pipeline
    └── http/routes/
        ├── ocr-documents.ts        # /v1/ocr/documents/**
        └── ocr-config.ts           # /v1/ocr/providers, configs, webhooks

db/migrations/
├── 0005_ocr_module.sql             # Core tables + enums + seed configs
└── 0006_ocr_webhooks.sql           # Webhook registry + delivery log

apps/web/src/features/ocr/
├── OcrPage.tsx                     # Document list + upload modal
├── OcrDocumentPage.tsx             # Detail view + preview + export + override
├── OcrConfigPage.tsx               # LLM providers + per-type config + webhooks
├── OcrMetricsPage.tsx              # Analytics dashboard + trending charts
├── components/
│   ├── ConfidenceBadge.tsx         # Color-coded confidence indicator
│   └── OcrResultViewer.tsx         # Tabbed result viewer (structured/raw/meta)
└── hooks/
    ├── useOcr.ts                   # Document & metrics React Query hooks
    └── useOcrConfig.ts             # Provider, config & webhook hooks
```

---

## Data Flow: Upload

```
Browser
  │  POST /v1/ocr/documents  (multipart/form-data)
  │  fields: file, autoDetectType, documentType?, autoProcess
  ▼
Route handler (ocr-documents.ts)
  │  Parses file + fields
  │  Auth: requireRole('admin', 'staff')
  ▼
UploadDocument (use case)
  │  Validates MIME type (allowlist)
  │  Validates file size (≤ OCR_MAX_FILE_MB)
  │  storage.save(buffer, fileName, mimeType)
  │    → returns storagePath + publicUrl
  │  repo.createDocument(...)
  ▼
Response: OcrDocument (201)
  │  (if autoProcess=true)
  ▼
ProcessDocument.execute(docId)   ← fire-and-forget, client polls
```

---

## Data Flow: Processing

```
ProcessDocument.execute(documentId, override?)
  │
  ├─ repo.findDocumentById(id)
  ├─ repo.createJob({ documentId, status: 'processing', ... })
  ├─ repo.updateDocumentStatus(id, 'processing')
  │
  ├─ RESOLVE FILE PATH
  │    local → filePath directly
  │    S3    → download to /tmp/{uuid}.ext, delete after
  │
  ├─ OCR STAGE
  │    OcrEngineFactory.forMimeType(mimeType)
  │      PDF  → PdfExtractor
  │               text layer?  → pdfjs-dist text extraction
  │               scanned?     → render pages @ 2× → TesseractEngine
  │      image → TesseractEngine (tesseract.js)
  │    result: { pages[], overallConfidence, rawText, engineVersion }
  │
  ├─ LLM STAGE (if provider available)
  │    resolve provider: override → type config → system default
  │    LlmProviderFactory.build(providerRecord) → ILlmProvider
  │
  │    if autoDetectType && no documentType:
  │      StructuredExtractor.detectDocumentType(rawText[:2000])
  │      → { documentType, confidence, tokensUsed }
  │
  │    StructuredExtractor.extract(rawText, documentType, config?)
  │      → { structuredData, tokensUsed, model }
  │
  ├─ BUILD OcrResultMetadata
  │    $schema, documentId, jobId, processedAt
  │    source, detection, ocr (pages + timing), llm?, structuredData, validation
  │
  ├─ PERSIST
  │    repo.updateJob(jobId, { status:'completed', rawText, metadata, ... })
  │    repo.updateDocument(id, { status:'completed', documentType, pageCount })
  │    repo.createMetric({ confidence, processingTimeMs, engine, model, ... })
  │
  └─ WEBHOOKS
       repo.listActiveWebhooks()
       for each webhook that subscribes to 'job.completed':
         fetch(webhook.url, { method:'POST', body: JSON.stringify(payload) })
           headers: X-OCR-Signature: sha256=<HMAC>   (if secret set)
                    X-OCR-Event: job.completed
         repo.createWebhookDelivery({ status, responseStatus, ... })
```

---

## Database Schema

### Entity Relationships

```
ocr_llm_providers ─────────────────────────────────┐
    id (PK)                                         │
    name, providerType, baseUrl, apiKey             │
    defaultModel, isActive, isDefault               │
                                                    │ FK: llmProviderId
ocr_document_configs                                │
    documentType (PK/UNIQUE)                        │
    ocrEngine, ocrLanguage, ocrDpi                  │
    preprocessingEnabled                            │
    llmProviderId ──────────────────────────────────┘
    llmModel, llmPromptTemplate, structuredSchema

ocr_documents
    id (PK, UUID)
    fileName, filePath, fileSizeBytes, mimeType
    pageCount, documentType, autoDetectType
    status: pending|processing|completed|failed
    uploadedBy (FK → users.id, nullable)
    createdAt, updatedAt

    └──< ocr_jobs (documentId FK, CASCADE DELETE)
            id (PK), status, ocrEngine, ocrEngineVersion
            llmProviderId, llmModel
            rawText (full OCR output)
            metadata (JSONB — OcrResultMetadata)
            errorMessage, startedAt, completedAt

    └──< ocr_metrics (documentId FK, CASCADE DELETE)
            id (PK), jobId (FK)
            overallConfidence, pageConfidences (JSONB)
            characterCount, wordCount, processingTimeMs
            ocrEngine, ocrEngineVersion
            llmModel, llmProvider, llmTokensUsed
            documentType, autoDetectedType, createdAt

ocr_webhooks
    id (PK), name, url, secret (nullable)
    events (JSONB array: ['job.completed', ...] or ['*'])
    isActive, createdAt, updatedAt

    └──< ocr_webhook_deliveries (webhookId FK, CASCADE DELETE)
            id (PK), event, payload (JSONB)
            status: success|failed
            responseStatus (HTTP code), errorMessage
            createdAt
```

### SQL Enums

```sql
ocr_document_type: invoice | receipt | contract | id_document
                   medical | bank_statement | form | other

ocr_status:        pending | processing | completed | failed

llm_provider_type: openai | anthropic | ollama | deepseek | custom
```

---

## OCR Engine Architecture

### Engine Selection

```typescript
// OcrEngineFactory
switch (mimeType) {
  case 'application/pdf':           return new PdfExtractor()
  case 'image/png':
  case 'image/jpeg':
  case 'image/tiff':
  case 'image/bmp':
  case 'image/webp':                return new TesseractEngine()
}
```

### PdfExtractor — Dual-Mode Processing

```
PDF Input
    │
    ├─ pdfjs-dist: getDocument(buffer).promise
    │              pdf.getPage(i).getTextContent()
    │
    ├─ Text density check (MIN_TEXT_CHARS_PER_PAGE = 50)
    │
    ├─ Has text layer? ──YES──► Return text pages directly
    │                           confidence ≈ 0.92 (proxy)
    │
    └─ Scanned PDF ──────────►  recognizeScanned()
                                  for each page:
                                    canvas = createCanvas(w*2, h*2)
                                    renderPage(canvas, scale=2.0)
                                    write PNG to /tmp/{uuid}-p{n}.png
                                    TesseractEngine.recognize(pngPath)
                                    delete tmp file
                                  engine label: 'pdfjs+tesseract'
```

### Confidence Scoring

| Source | Method |
|---|---|
| Tesseract | Raw 0–100 score normalized to 0–1 |
| PDF text layer | Fixed proxy 0.92 (high density) or lower for sparse pages |
| Scanned PDF | Average of Tesseract confidence per page |
| Overall | Arithmetic mean of all page confidences |

---

## LLM Provider Architecture

### Interface

```typescript
interface ILlmProvider {
  complete(systemPrompt: string, userPrompt: string): Promise<LlmResponse>
  readonly providerName: string
  readonly modelName: string
}

interface LlmResponse {
  content: string        // Raw model output
  tokensUsed: number     // input + output tokens
  model: string          // Actual model name from API response
}
```

### Provider Dispatch

```
LlmProviderFactory.build(providerRecord: LlmProvider) → ILlmProvider

  providerType = 'anthropic'  → AnthropicProvider(apiKey, model)
                                  SDK: @anthropic-ai/sdk
                                  API: messages.create, max_tokens=4096

  providerType = 'openai'     → OpenAiCompatibleProvider(...)
                                  SDK: openai
                                  baseUrl: https://api.openai.com/v1

  providerType = 'ollama'     → OpenAiCompatibleProvider(...)
                                  baseUrl: http://localhost:11434/v1
                                  apiKey: 'ollama' (required but ignored)

  providerType = 'deepseek'   → OpenAiCompatibleProvider(...)
                                  baseUrl: https://api.deepseek.com/v1

  providerType = 'custom'     → OpenAiCompatibleProvider(...)
                                  baseUrl: from provider record
```

### Structured Extraction Pipeline

```
StructuredExtractor

  Step 1 — Type Detection (optional)
    input:  rawText[:2000]
    prompt: "Classify this document. Return JSON: { type, confidence }"
    output: { documentType: OcrDocumentType, confidence: 0-1 }

  Step 2 — Structured Extraction
    schema:  type-specific JSON schema (8 pre-defined + custom override)
    prompt:  "Extract structured data from this {type} document.
              Return JSON matching schema: {schema}
              Custom instructions: {llmPromptTemplate if set}"
    output:  structuredData (parsed JSON or { raw: content } fallback)
```

---

## Storage Architecture

```typescript
interface IFileStorage {
  save(buffer, fileName, mimeType):  { storagePath, publicUrl }
  read(storagePath):                 Buffer
  delete(storagePath):               void
  getServeUrl(storagePath, ttl?):    string   // signed or direct
  readonly provider:                 'local' | 's3'
}
```

### Local Storage
- Files stored at `{OCR_UPLOAD_DIR}/{uuid}{ext}`
- Preview served by streaming through the Fastify route `/v1/ocr/documents/:id/file`
- `publicUrl = null` (no direct public access)

### S3 Storage
- Files stored at key `ocr/{uuid}`
- `getServeUrl()` → `GetObjectCommand` → pre-signed URL (default TTL: 3600s)
- If `S3_PUBLIC_URL` set → direct CDN URL (no signing overhead)
- Preview served by HTTP 302 redirect to signed URL
- Compatible: AWS S3, Cloudflare R2, MinIO (via `S3_ENDPOINT`)

---

## Security Model

| Concern | Implementation |
|---|---|
| Route auth | `requireAuth` (any valid JWT) or `requireRole('admin','staff')` |
| Config/webhooks | `requireRole('admin')` only |
| API keys at rest | Stored in DB; always masked as `'***'` in API list responses |
| File access | All file routes require valid JWT; S3 files behind signed URLs |
| Webhook signing | HMAC-SHA256 over raw JSON body using per-webhook secret |
| File uploads | MIME type allowlist + file size limit enforced server-side |
| SQL injection | Drizzle ORM parameterized queries throughout |

---

## Frontend Architecture

React 18 + TanStack Query v5 + react-router-dom v6

### Query Key Strategy

```
['ocr-documents', page]           → list with pagination
['ocr-document', id]              → detail (auto-refetch if processing)
['ocr-metrics-aggregate']         → KPI totals
['ocr-metrics-list', opts]        → raw metrics rows
['ocr-metrics-trending', days, type] → time-series data
['ocr-llm-providers']             → provider list
['ocr-configs']                   → per-type config list
['ocr-webhooks']                  → webhook list
```

### Auto-Polling

`useOcrDocument(id)` automatically polls every **3 seconds** while the document status is `pending` or `processing`, and stops polling once it reaches `completed` or `failed`.

```typescript
refetchInterval: (query) => {
  const status = query.state.data?.document.status
  return (status === 'pending' || status === 'processing') ? 3000 : false
}
```

### File Preview

The preview panel authenticates file requests using the JWT from `localStorage`:

```typescript
fetch(documentFileUrl(docId), {
  headers: { Authorization: `Bearer ${token}` }
})
.then(r => r.blob())
.then(blob => URL.createObjectURL(blob))
// → passed to <img src> or <iframe src>
```
