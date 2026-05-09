# Metadata Schema

Every successfully processed document produces an `OcrResultMetadata` object. This object is stored as JSONB in the `ocr_jobs.metadata` column, returned inline by `GET /v1/ocr/documents/:id`, and exported via `GET /v1/ocr/documents/:id/export`.

The schema is inspired by **W3C Web Annotation** conventions and **ISO/TS 8000** data quality principles.

---

## Full Schema Reference

```typescript
interface OcrResultMetadata {
  $schema:     'ocr-result/v1'   // Version identifier
  documentId:  string            // UUID of the OcrDocument
  jobId:       string            // UUID of the OcrJob
  processedAt: string            // ISO 8601 timestamp

  source:    OcrSource
  detection: OcrDetection
  ocr:       OcrSection
  llm:       OcrLlmSection | null
  structuredData: Record<string, unknown> | null
  validation: OcrValidation
}
```

---

## `source` — Document provenance

```typescript
interface OcrSource {
  fileName:      string   // Original file name as uploaded
  mimeType:      string   // e.g. "application/pdf", "image/png"
  fileSizeBytes: number   // Raw byte count
  pageCount:     number   // Total pages processed
}
```

**Example**

```json
"source": {
  "fileName": "invoice-march-2025.pdf",
  "mimeType": "application/pdf",
  "fileSizeBytes": 245760,
  "pageCount": 3
}
```

---

## `detection` — Document type classification

```typescript
interface OcrDetection {
  documentType:        OcrDocumentType    // Resolved type
  autoDetected:        boolean            // True if LLM classified it
  detectionConfidence: number | null      // 0–1, null if manually set
}
```

**Example — auto-detected**

```json
"detection": {
  "documentType": "invoice",
  "autoDetected": true,
  "detectionConfidence": 0.97
}
```

**Example — manually set**

```json
"detection": {
  "documentType": "contract",
  "autoDetected": false,
  "detectionConfidence": null
}
```

---

## `ocr` — Optical character recognition results

```typescript
interface OcrSection {
  engine:           string              // 'tesseract' | 'pdfjs' | 'pdfjs+tesseract'
  engineVersion:    string | null       // e.g. 'v5.7.284'
  language:         string              // e.g. 'por+eng'
  processingTimeMs: number              // Wall-clock time for OCR stage only
  overallConfidence: number             // 0–1, mean of all page confidences
  pages:            OcrPageResult[]
}

interface OcrPageResult {
  pageNumber: number   // 1-indexed
  confidence: number   // 0–1
  wordCount:  number
  rawText:    string   // Extracted text for this page
}
```

**Example**

```json
"ocr": {
  "engine": "pdfjs+tesseract",
  "engineVersion": "pdfjs/5.7.284+tesseract/6.0.0",
  "language": "por+eng",
  "processingTimeMs": 3421,
  "overallConfidence": 0.87,
  "pages": [
    {
      "pageNumber": 1,
      "confidence": 0.91,
      "wordCount": 234,
      "rawText": "FACTURA\nFornecedor: ACME Lda\nNIF: 502345678\n..."
    },
    {
      "pageNumber": 2,
      "confidence": 0.83,
      "wordCount": 189,
      "rawText": "Condições de Pagamento: 30 dias\nTotal: 1.250,00 EUR\n..."
    }
  ]
}
```

### Confidence Scoring

| Engine | Method |
|---|---|
| Tesseract | Raw 0–100 score ÷ 100 |
| PDF.js (text layer) | Proxy score based on text density (≈0.92 for dense pages) |
| PDF.js + Tesseract | Tesseract confidence per rendered page |

### Engine Labels

| Label | Meaning |
|---|---|
| `tesseract` | Image processed by Tesseract.js |
| `pdfjs` | PDF with extractable text layer |
| `pdfjs+tesseract` | Scanned PDF — pages rendered then OCR'd by Tesseract |

---

## `llm` — Language model extraction

Present only when an LLM provider was invoked. `null` if no active provider was found or the LLM stage was skipped.

```typescript
interface OcrLlmSection {
  provider:         string   // e.g. 'anthropic', 'openai', 'ollama'
  model:            string   // Actual model name from API response
  processingTimeMs: number   // Wall-clock time for LLM stage only
  tokensUsed:       number   // input + output tokens
}
```

**Example**

```json
"llm": {
  "provider": "anthropic",
  "model": "claude-sonnet-4-6",
  "processingTimeMs": 2180,
  "tokensUsed": 847
}
```

---

## `structuredData` — Extracted fields

The parsed JSON output of the LLM extraction stage. Shape varies by document type (see [LLM Providers — Extraction Schemas](./llm-providers.md)).

`null` when no LLM was configured or the extraction was skipped.

**Example — invoice**

```json
"structuredData": {
  "vendor": "ACME Lda",
  "invoiceNumber": "FT 2025/0042",
  "date": "2025-03-10",
  "dueDate": "2025-04-09",
  "lineItems": [
    { "description": "Serviços de Consultoria", "quantity": 10, "unitPrice": 100.00, "total": 1000.00 },
    { "description": "Deslocações", "quantity": 1, "unitPrice": 250.00, "total": 250.00 }
  ],
  "subtotal": 1250.00,
  "taxRate": 23,
  "taxAmount": 287.50,
  "total": 1537.50,
  "currency": "EUR",
  "paymentTerms": "30 dias",
  "notes": "NIF cliente: 509876543"
}
```

**Fallback on parse failure**

If the LLM returns invalid JSON, the extractor falls back to:

```json
"structuredData": {
  "raw": "<full LLM response text>"
}
```

---

## `validation` — Data quality assessment

```typescript
interface OcrValidation {
  status: 'valid' | 'needs_review' | 'failed'
  issues: string[]
}
```

| Status | Meaning |
|---|---|
| `valid` | OCR and extraction completed without anomalies |
| `needs_review` | LLM JSON parsing failed, or confidence below threshold |
| `failed` | OCR itself failed (engine error, corrupt file) |

**Example — valid**

```json
"validation": {
  "status": "valid",
  "issues": []
}
```

**Example — needs review**

```json
"validation": {
  "status": "needs_review",
  "issues": [
    "LLM response could not be parsed as JSON — stored as raw text",
    "Page 2 confidence below 0.50 threshold (0.38)"
  ]
}
```

---

## Complete Example

```json
{
  "$schema": "ocr-result/v1",
  "documentId": "018e1234-abcd-7000-8000-000000000001",
  "jobId":       "018e9999-abcd-7000-8000-000000000002",
  "processedAt": "2025-03-15T10:23:45.123Z",

  "source": {
    "fileName":      "invoice-acme-march.pdf",
    "mimeType":      "application/pdf",
    "fileSizeBytes": 245760,
    "pageCount":     2
  },

  "detection": {
    "documentType":        "invoice",
    "autoDetected":        true,
    "detectionConfidence": 0.97
  },

  "ocr": {
    "engine":             "pdfjs",
    "engineVersion":      "5.7.284",
    "language":           "por+eng",
    "processingTimeMs":   1243,
    "overallConfidence":  0.92,
    "pages": [
      {
        "pageNumber": 1,
        "confidence": 0.94,
        "wordCount":  312,
        "rawText":    "FACTURA\nFornecedor: ACME Lda\n..."
      },
      {
        "pageNumber": 2,
        "confidence": 0.90,
        "wordCount":  198,
        "rawText":    "Total: 1.537,50 EUR\nIVA (23%): 287,50 EUR\n..."
      }
    ]
  },

  "llm": {
    "provider":         "anthropic",
    "model":            "claude-sonnet-4-6",
    "processingTimeMs": 2180,
    "tokensUsed":       847
  },

  "structuredData": {
    "vendor":        "ACME Lda",
    "invoiceNumber": "FT 2025/0042",
    "date":          "2025-03-10",
    "dueDate":       "2025-04-09",
    "subtotal":      1250.00,
    "taxRate":       23,
    "taxAmount":     287.50,
    "total":         1537.50,
    "currency":      "EUR"
  },

  "validation": {
    "status": "valid",
    "issues": []
  }
}
```

---

## CSV Export Mapping

The `GET /:id/export?format=csv` endpoint flattens the metadata into rows:

| CSV field | Source |
|---|---|
| `documentId` | `metadata.documentId` |
| `processedAt` | `metadata.processedAt` |
| `documentType` | `metadata.detection.documentType` |
| `autoDetected` | `metadata.detection.autoDetected` |
| `ocrEngine` | `metadata.ocr.engine` |
| `ocrConfidence` | `metadata.ocr.overallConfidence` |
| `ocrProcessingMs` | `metadata.ocr.processingTimeMs` |
| `llmModel` | `metadata.llm.model` |
| `llmProvider` | `metadata.llm.provider` |
| `llmTokensUsed` | `metadata.llm.tokensUsed` |
| `pages` | `metadata.ocr.pages.length` |
| `validationStatus` | `metadata.validation.status` |
| `data.<key>` | Each key in `metadata.structuredData` |

Nested objects within `structuredData` (e.g. `lineItems` array) are JSON-stringified in the CSV value.

---

## Schema Versioning

The `$schema` field (`"ocr-result/v1"`) allows future breaking changes to be handled gracefully by consumers. When querying the `metadata` JSONB column directly, filter by version if needed:

```sql
SELECT * FROM ocr_jobs
WHERE metadata->>'$schema' = 'ocr-result/v1'
  AND metadata->'ocr'->>'engine' = 'tesseract';
```
