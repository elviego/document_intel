# API Reference

Base path: `/v1/ocr`

All endpoints require a valid JWT `Authorization: Bearer <token>` header.  
Roles: **auth** = any authenticated user · **staff** = admin or staff · **admin** = admin only.

---

## Documents

### Upload a document

```
POST /v1/ocr/documents
Content-Type: multipart/form-data
Role: staff
```

**Form fields**

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | Yes | PDF, PNG, JPEG, TIFF, BMP, or WebP. Max `OCR_MAX_FILE_MB`. |
| `autoDetectType` | string (`'true'`/`'false'`) | No | Default `'true'`. Use AI to detect document type. |
| `documentType` | string | Only if autoDetectType=false | One of the 8 document types. |
| `autoProcess` | string (`'true'`/`'false'`) | No | Default `'false'`. Trigger OCR immediately after upload. |

**Response `201`**

```json
{
  "id": "018e1234-...",
  "fileName": "invoice-march.pdf",
  "fileSizeBytes": 245760,
  "mimeType": "application/pdf",
  "pageCount": null,
  "documentType": null,
  "autoDetectType": true,
  "status": "pending",
  "createdAt": "2025-03-15T10:22:00.000Z",
  "updatedAt": "2025-03-15T10:22:00.000Z"
}
```

If `autoProcess=true`, processing starts in the background. Poll `GET /:id` for status updates.

---

### Batch upload

```
POST /v1/ocr/documents/batch
Content-Type: multipart/form-data
Role: staff
```

Upload multiple files in a single request. All non-file fields are shared across files.

**Form fields**: same as single upload, plus multiple `file` entries.

**Response `207 Multi-Status`**

```json
{
  "results": [
    { "fileName": "invoice.pdf", "id": "018e1234-..." },
    { "fileName": "receipt.png", "id": "018e5678-..." },
    { "fileName": "corrupt.pdf", "error": "File exceeds 50 MB limit" }
  ]
}
```

Each result has either `id` (success) or `error` (failure). The overall HTTP status is always 207.

---

### List documents

```
GET /v1/ocr/documents
Role: auth
```

**Query parameters**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `limit` | integer | `50` | Max 200 |
| `offset` | integer | `0` | Pagination offset |
| `status` | string | — | Filter: `pending` `processing` `completed` `failed` |
| `documentType` | string | — | Filter by one of the 8 document types |

**Response `200`**

```json
{
  "items": [ /* OcrDocument[] */ ],
  "total": 142
}
```

---

### Get document + latest job

```
GET /v1/ocr/documents/:id
Role: auth
```

**Response `200`**

```json
{
  "document": {
    "id": "018e1234-...",
    "fileName": "invoice-march.pdf",
    "fileSizeBytes": 245760,
    "mimeType": "application/pdf",
    "pageCount": 3,
    "documentType": "invoice",
    "autoDetectType": true,
    "status": "completed",
    "createdAt": "2025-03-15T10:22:00.000Z",
    "updatedAt": "2025-03-15T10:23:45.000Z"
  },
  "job": {
    "id": "018e9999-...",
    "documentId": "018e1234-...",
    "status": "completed",
    "ocrEngine": "pdfjs",
    "ocrEngineVersion": "4.x",
    "rawText": "INVOICE\nVendor: ACME Corp\n...",
    "metadata": { /* OcrResultMetadata — see metadata-schema.md */ },
    "errorMessage": null,
    "startedAt": "2025-03-15T10:22:05.000Z",
    "completedAt": "2025-03-15T10:23:45.000Z"
  }
}
```

`job` is `null` if the document has never been processed.

---

### Serve raw file (preview)

```
GET /v1/ocr/documents/:id/file
Role: auth
```

**Behavior**

- **Local storage**: Streams file bytes with `Content-Type` and `Content-Disposition: inline`.
- **S3 storage**: Returns `302 Redirect` to a pre-signed URL (TTL: 3600 seconds).

Use this endpoint to render document previews in the browser. The frontend fetches this URL with an `Authorization` header and converts the response to a Blob URL.

---

### Process a document

```
POST /v1/ocr/documents/:id/process
Content-Type: application/json
Role: staff
```

Triggers OCR + optional LLM extraction. Runs synchronously (unlike autoProcess which is fire-and-forget). Provides override values that take precedence over stored configuration.

**Request body** (all fields optional)

```json
{
  "documentType": "invoice",
  "llmProviderId": "018e-...",
  "llmModel": "claude-3-5-sonnet-20241022"
}
```

**Response `200`** — full `OcrResultMetadata` object (see [Metadata Schema](./metadata-schema.md))

---

### Export results

```
GET /v1/ocr/documents/:id/export?format=json
Role: auth
```

**Query parameters**

| Parameter | Values | Default |
|---|---|---|
| `format` | `json` `csv` | `json` |

**JSON export** — Full `OcrResultMetadata` as a `.json` file download.

**CSV export** — Flattened key-value representation:

```
field,value
documentId,018e1234-...
processedAt,2025-03-15T10:23:45.000Z
documentType,invoice
autoDetected,true
ocrEngine,pdfjs
ocrConfidence,0.92
ocrProcessingMs,1243
llmModel,claude-3-5-sonnet-20241022
llmProvider,anthropic
llmTokensUsed,847
pages,3
validationStatus,valid
data.vendor,ACME Corp
data.invoiceNumber,INV-2025-0042
data.total,1250.00
data.currency,EUR
```

`structuredData` fields are flattened as `data.<key>`.

---

### Delete document

```
DELETE /v1/ocr/documents/:id
Role: admin
```

Deletes the file from storage (local or S3) **and** all associated database records (document, jobs, metrics) via CASCADE.

**Response `204 No Content`**

---

## Metrics

### Aggregate KPIs

```
GET /v1/ocr/documents/metrics/aggregate
Role: admin
```

**Response `200`**

```json
{
  "totalDocuments": 247,
  "avgConfidence": 0.87,
  "avgProcessingMs": 2341,
  "byEngine": [
    { "engine": "pdfjs", "count": 180 },
    { "engine": "tesseract", "count": 67 }
  ],
  "byDocType": [
    { "documentType": "invoice", "count": 134 },
    { "documentType": "receipt", "count": 89 }
  ],
  "byLlmModel": [
    { "model": "claude-3-5-sonnet-20241022", "count": 201 },
    { "model": "gpt-4o", "count": 46 }
  ]
}
```

---

### List metrics

```
GET /v1/ocr/documents/metrics/list
Role: admin
```

**Query parameters**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `limit` | integer | `100` | Max 500 |
| `offset` | integer | `0` | Pagination |
| `documentId` | UUID | — | Filter to a single document's metrics history |

**Response `200`** — Array of `OcrMetric` objects:

```json
[
  {
    "id": "018eaaaa-...",
    "jobId": "018e9999-...",
    "documentId": "018e1234-...",
    "overallConfidence": 0.92,
    "pageConfidences": [0.94, 0.91, 0.91],
    "characterCount": 3820,
    "wordCount": 647,
    "processingTimeMs": 1243,
    "ocrEngine": "pdfjs",
    "ocrEngineVersion": "4.x",
    "llmModel": "claude-3-5-sonnet-20241022",
    "llmProvider": "anthropic",
    "llmTokensUsed": 847,
    "documentType": "invoice",
    "autoDetectedType": true,
    "createdAt": "2025-03-15T10:23:45.000Z"
  }
]
```

---

### Trending (time-series)

```
GET /v1/ocr/documents/metrics/trending
Role: admin
```

**Query parameters**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `days` | integer (1–365) | `30` | Lookback window |
| `documentType` | string | — | Filter to one document type |

**Response `200`**

```json
[
  { "date": "2025-03-01", "avgConfidence": 0.89, "count": 12, "avgProcessingMs": 2100 },
  { "date": "2025-03-02", "avgConfidence": 0.91, "count": 8,  "avgProcessingMs": 1950 },
  { "date": "2025-03-03", "avgConfidence": null, "count": 0,  "avgProcessingMs": null }
]
```

Days with no activity return `null` for numeric averages and `0` for count. Dates are ISO 8601 (`YYYY-MM-DD`).

---

## Configuration

### LLM Providers

#### List providers

```
GET /v1/ocr/providers
Role: admin
```

`apiKey` is always masked as `"***"` in responses.

#### Create provider

```
POST /v1/ocr/providers
Content-Type: application/json
Role: admin
```

```json
{
  "name": "Production Claude",
  "providerType": "anthropic",
  "apiKey": "sk-ant-...",
  "baseUrl": null,
  "defaultModel": "claude-3-5-sonnet-20241022",
  "isActive": true,
  "isDefault": false
}
```

#### Update provider

```
PATCH /v1/ocr/providers/:id
Content-Type: application/json
Role: admin
```

All fields optional. Omit `apiKey` to keep the existing key.

#### Set default provider

```
PUT /v1/ocr/providers/:id/default
Role: admin
```

Atomically clears all `isDefault` flags and sets this provider as default. No request body.  
**Response `200`** — Updated provider record.

#### Delete provider

```
DELETE /v1/ocr/providers/:id
Role: admin
```

**Response `204`**

---

### Document-Type Configurations

#### List all configs

```
GET /v1/ocr/configs
Role: admin
```

Returns one config object per document type (8 total, seeded on migration).

#### Get single config

```
GET /v1/ocr/configs/:documentType
Role: admin
```

#### Upsert config

```
PUT /v1/ocr/configs/:documentType
Content-Type: application/json
Role: admin
```

Creates or replaces the configuration for this document type.

```json
{
  "ocrEngine": "tesseract",
  "ocrLanguage": "por+eng",
  "ocrDpi": 300,
  "preprocessingEnabled": false,
  "llmProviderId": "018e-...",
  "llmModel": "claude-3-5-sonnet-20241022",
  "llmPromptTemplate": "Focus on extracting line items with exact amounts.",
  "structuredSchema": null
}
```

All fields are optional — omitted fields retain their current values.

---

### Webhooks

#### List webhooks

```
GET /v1/ocr/webhooks
Role: admin
```

#### Create webhook

```
POST /v1/ocr/webhooks
Content-Type: application/json
Role: admin
```

```json
{
  "name": "Zapier Integration",
  "url": "https://hooks.zapier.com/hooks/catch/...",
  "secret": "my-signing-secret",
  "events": ["document.completed", "document.failed"],
  "isActive": true
}
```

**Events**: `document.uploaded` · `document.processing` · `document.completed` · `document.failed` · `document.deleted`

#### Update webhook

```
PATCH /v1/ocr/webhooks/:id
Content-Type: application/json
Role: admin
```

Omit `secret` to retain the existing secret.

#### Delete webhook

```
DELETE /v1/ocr/webhooks/:id
Role: admin
```

**Response `204`**

---

## Error Responses

All error responses follow the platform's standard envelope:

```json
{
  "statusCode": 422,
  "code": "VALIDATION_ERROR",
  "message": "File type not supported. Allowed: PDF, PNG, JPEG, TIFF, BMP, WebP",
  "reqId": "req-abc123"
}
```

| HTTP Status | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid request body or query params |
| 401 | `UNAUTHORIZED` | Missing or expired JWT |
| 403 | `FORBIDDEN` | Insufficient role |
| 404 | `NOT_FOUND` | Document, job, provider, or config not found |
| 413 | `FILE_TOO_LARGE` | File exceeds `OCR_MAX_FILE_MB` |
| 422 | `UNSUPPORTED_FILE_TYPE` | MIME type not in allowlist |
| 500 | `INTERNAL_ERROR` | Unhandled exception (processing failures included) |
