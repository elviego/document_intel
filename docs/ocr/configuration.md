# Configuration

---

## Environment Variables

All variables are validated with Zod at startup. Missing required variables cause the API to exit immediately with a descriptive error.

### Core OCR Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OCR_UPLOAD_DIR` | No | `uploads/ocr` | Directory for local file storage. Relative to API working directory. Created automatically. |
| `OCR_MAX_FILE_MB` | No | `50` | Maximum upload size in megabytes. Applies to both single and batch uploads. |
| `STORAGE_PROVIDER` | No | `local` | `local` or `s3`. See [Deployment](./deployment.md) for S3 setup. |

### S3 / R2 / MinIO Variables

Only required when `STORAGE_PROVIDER=s3`.

| Variable | Required | Description |
|---|---|---|
| `S3_BUCKET` | Yes | Bucket name |
| `S3_REGION` | Yes | Region string (e.g. `eu-west-1`, `auto` for Cloudflare R2) |
| `S3_ACCESS_KEY` | Yes | Access key ID |
| `S3_SECRET_KEY` | Yes | Secret access key |
| `S3_ENDPOINT` | No | Custom endpoint URL. Required for Cloudflare R2 and MinIO. Omit for AWS S3. |
| `S3_PUBLIC_URL` | No | CDN base URL. If set, file previews use direct URLs instead of pre-signed ones. |

### Full `.env.example`

```env
NODE_ENV=development
PORT=4000

# Database
DATABASE_URL=postgresql://postgres:[password]@[host].railway.app:5432/railway

# Auth
JWT_SECRET=<openssl rand -hex 32>

# Email
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@triboverde.pt

# CORS
CORS_ORIGIN=http://localhost:3000
APP_URL=http://localhost:3000

# OCR — local storage (default)
OCR_UPLOAD_DIR=uploads/ocr
OCR_MAX_FILE_MB=50
STORAGE_PROVIDER=local

# OCR — S3 (uncomment to enable)
# STORAGE_PROVIDER=s3
# S3_BUCKET=my-bucket
# S3_REGION=auto
# S3_ACCESS_KEY=
# S3_SECRET_KEY=
# S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
# S3_PUBLIC_URL=https://pub.example.com
```

---

## Database Migrations

The OCR module uses two migration files that must be applied in order:

```bash
pnpm db:migrate
```

| File | Contents |
|---|---|
| `0005_ocr_module.sql` | Enums, 5 core tables, indexes, seed configs |
| `0006_ocr_webhooks.sql` | `ocr_webhooks` + `ocr_webhook_deliveries` tables |

### What the seed creates

On first migration, one default `OcrDocumentConfig` row is inserted for each of the 8 document types:

```sql
INSERT INTO ocr_document_configs (document_type, ocr_engine, ocr_language, ocr_dpi, preprocessing_enabled)
VALUES
  ('invoice',       'tesseract', 'por+eng', 300, false),
  ('receipt',       'tesseract', 'por+eng', 300, false),
  ('contract',      'tesseract', 'por+eng', 300, false),
  ('id_document',   'tesseract', 'por+eng', 300, false),
  ('medical',       'tesseract', 'por+eng', 300, false),
  ('bank_statement','tesseract', 'por+eng', 300, false),
  ('form',          'tesseract', 'por+eng', 300, false),
  ('other',         'tesseract', 'por+eng', 300, false);
```

No LLM provider is pre-configured — configure one via the admin UI after migration.

---

## Per-Document-Type Configuration

Each document type has its own row in `ocr_document_configs`. Configure via the admin UI at `/ocr/config` or via the API (`PUT /v1/ocr/configs/:documentType`).

### Fields

| Field | Type | Default | Description |
|---|---|---|---|
| `ocrEngine` | string | `tesseract` | OCR engine to use. Currently only `tesseract` is user-selectable; `pdfjs` is selected automatically for PDFs. |
| `ocrLanguage` | string | `por+eng` | Tesseract language pack. Separate multiple with `+`. See language codes below. |
| `ocrDpi` | integer | `300` | DPI for scanned PDF rendering. Higher = better quality, slower processing. |
| `preprocessingEnabled` | boolean | `false` | Reserved for future image preprocessing (deskew, denoise). |
| `llmProviderId` | UUID | `null` | Override which LLM provider is used for this document type. |
| `llmModel` | string | `null` | Override the model within the chosen provider. |
| `llmPromptTemplate` | string | `null` | Additional extraction instructions appended to the base prompt. |
| `structuredSchema` | JSON | `null` | Override the built-in extraction schema. |

### OCR Language Codes

Tesseract.js uses ISO 639-2/T language codes. Common codes:

| Code | Language |
|---|---|
| `por` | Portuguese |
| `eng` | English |
| `spa` | Spanish |
| `fra` | French |
| `deu` | German |
| `ita` | Italian |
| `nld` | Dutch |
| `por+eng` | Portuguese + English (multi-language, recommended) |

Multiple languages: `por+eng+spa`

### DPI Guidelines

| DPI | Use case | Speed |
|---|---|---|
| 150 | Screen captures, digital-native PDFs | Fast |
| 300 | Standard scanned documents (recommended) | Medium |
| 400 | Small print, dense tables | Slower |
| 600 | Very fine print, passports, legal docs | Slow |

DPI only applies to the scanned PDF path (PDF.js + Tesseract). Native text PDFs and image uploads are not affected.

---

## LLM Provider Configuration

Providers are managed at runtime via the admin UI or API. No restart required.

### Priority Hierarchy

```
Request override (llmProviderId in process body)
    ↓
Per-type config (ocr_document_configs.llm_provider_id)
    ↓
System default (ocr_llm_providers WHERE is_default = true)
    ↓
No LLM (skip extraction, structuredData = null)
```

### Marking a Provider as Default

Only one provider can be the system default. Using the "Set default" action in the UI atomically:
1. Clears `is_default = false` on all providers
2. Sets `is_default = true` on the selected provider

### API Key Security

- API keys are stored in the database (encrypted at the database level if using Railway's encryption at rest)
- All API responses mask the key as `"***"`
- Keys are only read server-side when constructing the LLM provider instance
- To rotate a key: `PATCH /v1/ocr/providers/:id` with the new `apiKey`

---

## Webhook Configuration

Webhooks are configured via `/ocr/config` → Webhooks section. See [Webhooks](./webhooks.md) for the full reference.

### Supported Events

| Event | Triggered when |
|---|---|
| `document.uploaded` | File successfully uploaded (before processing) |
| `document.processing` | OCR processing starts |
| `document.completed` | Processing finished successfully |
| `document.failed` | Processing failed with an error |
| `document.deleted` | Document deleted via API |

---

## Tuning Recommendations

### For high-volume deployments

- Set `STORAGE_PROVIDER=s3` — avoids local disk I/O bottlenecks
- Use `autoProcess=false` and trigger processing during off-peak hours
- Set `OCR_MAX_FILE_MB=10` to prevent large file abuse
- Configure separate LLM providers per document type to distribute API costs

### For privacy-sensitive documents

- Deploy Ollama locally and configure it as the default LLM provider
- Use `STORAGE_PROVIDER=local` to keep files on your own infrastructure
- Disable `autoDetectType` for known-type workflows (reduces data sent to external APIs)
- Rotate webhook secrets regularly

### For multilingual document sets

- Set `ocrLanguage=por+eng` in all configs (the default)
- For Spanish documents: `ocrLanguage=spa+eng`
- Choose a multilingual LLM model: `qwen2.5` (Ollama), `claude-sonnet-4-6`, `gpt-4o`
- Add language-specific hints in `llmPromptTemplate`:  
  `"Documents are in European Portuguese. Amounts use comma as decimal separator."`
