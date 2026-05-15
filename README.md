# Document Intel — OCR Module

An end-to-end document intelligence pipeline built on **Node.js + Fastify + React**. Upload any document, extract text via OCR, and use a configurable LLM to produce structured JSON output. Tracks quality metrics, delivers real-time webhook notifications, and supports multiple cloud storage backends.

---

## Table of Contents

- [Stack](#stack)
- [Architecture](#architecture)
- [Features](#features)
- [UI Pages](#ui-pages)
- [Repository Structure](#repository-structure)
- [Running Locally](#running-locally)
- [Deploying to Production](#deploying-to-production)
  - [Railway (API) + Vercel (Web)](#railway-api--vercel-web)
  - [Railway only (API + Web)](#railway-only-api--web)
- [OcrResultMetadata Schema](#ocrresultmetadata-schema)
- [API Overview](#api-overview)
- [Documentation](#documentation)
- [Roles](#roles)
- [Licence](#licence)

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS · TanStack Query |
| Backend | Node.js · Fastify v5 · TypeScript (ESM) |
| ORM | Drizzle ORM |
| Database | PostgreSQL |
| OCR — Images | Tesseract.js |
| OCR — PDFs | PDF.js (text layer) · PDF.js + Tesseract (scanned) |
| LLM — Anthropic | @anthropic-ai/sdk (Claude) |
| LLM — OpenAI-compatible | openai SDK (OpenAI · Ollama · DeepSeek · Custom) |
| File Storage | Local filesystem · AWS S3 · Cloudflare R2 · MinIO |
| Auth | Custom JWT (bcryptjs) |
| Monorepo | Turborepo · pnpm workspaces |
| CI/CD | GitHub Actions → Vercel (web) · Railway (api) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Browser / Client                          │
│  Upload (drag-drop, batch) · Preview · Export · Config Admin    │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / REST
┌────────────────────────────▼────────────────────────────────────┐
│                      Fastify API (port 4000)                    │
│  POST /v1/ocr/documents      GET /:id/file    DELETE /:id       │
│  POST /v1/ocr/documents/batch                GET /:id/export    │
│  POST /v1/ocr/documents/:id/process                             │
│  GET  /v1/ocr/documents/metrics/*   GET /v1/ocr/providers       │
└───────┬──────────────────────────────────────────────┬──────────┘
        │ Use Cases                                    │ Webhooks
┌───────▼───────────┐   ┌──────────────────┐  ┌───────▼──────────┐
│  UploadDocument   │   │  ProcessDocument  │  │  HMAC-SHA256     │
└───────────────────┘   └────────┬─────────┘  │  signed delivery │
                                 │            └──────────────────┘
               ┌─────────────────┼────────────────────┐
               │                 │                    │
    ┌──────────▼──────┐ ┌────────▼───────┐ ┌─────────▼────────┐
    │   OCR Engine    │ │  LLM Provider  │ │  File Storage    │
    │ Tesseract (img) │ │ Anthropic      │ │  Local / S3      │
    │ PDFjs  (text)   │ │ OpenAI         │ │  R2 / MinIO      │
    │ PDFjs+Tesseract │ │ Ollama (local) │ └──────────────────┘
    │   (scanned PDF) │ │ DeepSeek       │
    └─────────────────┘ │ Custom OAI     │
                        └────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │       PostgreSQL         │
                    │  ocr_documents           │
                    │  ocr_jobs                │
                    │  ocr_metrics             │
                    │  ocr_llm_providers       │
                    │  ocr_document_configs    │
                    │  ocr_webhooks            │
                    │  ocr_webhook_deliveries  │
                    └─────────────────────────┘
```

The backend follows **Clean Architecture / DDD**: domain entities and repository interfaces are framework-free; application use cases orchestrate them; infrastructure provides concrete implementations.

---

## Features

### Document Ingestion
- Single or **batch** file upload with drag-and-drop UI
- Supported formats: **PDF · PNG · JPEG · TIFF · BMP · WebP**
- Configurable max file size (`OCR_MAX_FILE_MB`, default 50 MB)
- **Auto-detect** document type via LLM or manual selection

### OCR Pipeline

| Input | Engine | Notes |
|---|---|---|
| Images | **Tesseract.js** | Language packs configurable per document type |
| PDF with text layer | **PDF.js** | Direct extraction, no GPU required |
| Scanned PDF | **PDF.js + Tesseract** | Pages rendered at 2× scale → image OCR |

### LLM Structured Extraction

| Provider | Type | Notes |
|---|---|---|
| **Anthropic Claude** | `anthropic` | Native SDK · Best for complex documents |
| **OpenAI** | `openai` | GPT-4o, GPT-4 Turbo, GPT-4o-mini |
| **Ollama** | `ollama` | Fully local — no data leaves your server |
| **DeepSeek** | `deepseek` | Cost-effective · Strong multilingual |
| **Custom endpoint** | `custom` | Any OpenAI-compatible API |

### Document Types & Schemas

| Type | Extracted fields |
|---|---|
| `invoice` | vendor, invoiceNumber, date, lineItems, tax, total, currency |
| `receipt` | merchant, date, items, total, paymentMethod |
| `contract` | parties, effectiveDate, keyTerms, obligations, jurisdiction |
| `id_document` | fullName, dateOfBirth, documentNumber, nationality, expiry |
| `medical` | patient, date, diagnosis, prescriptions, provider |
| `bank_statement` | account, period, openingBalance, closingBalance, transactions |
| `form` | title, fields (key-value pairs) |
| `other` | raw extracted text |

Custom extraction schemas and prompt templates configurable per document type.

### More Capabilities
- **In-browser document preview** (image + PDF, authenticated blob URL)
- **Re-process with override** — change doc type, LLM provider, or model on demand
- **Export** — full `OcrResultMetadata` as JSON or flattened CSV
- **Quality metrics** — confidence, processing time, token usage tracked in PostgreSQL
- **Trending charts** — confidence % and volume over time (7 / 30 / 90 days)
- **Webhooks** — HMAC-SHA256 signed HTTP notifications on 5 event types
- **Delivery audit log** — every webhook attempt recorded
- **Role-based access** — `admin` full access · `staff` upload/process · `accountant` read-only

---

## UI Pages

| Route | Description |
|---|---|
| `/ocr` | Document list, drag-and-drop single + batch upload |
| `/ocr/:id` | Detail view · preview panel · export JSON/CSV · re-process modal |
| `/ocr/config` | LLM providers · per-type OCR settings · webhook management |
| `/ocr/metrics` | KPI dashboard · distribution charts · quality trend lines |

---

## Repository Structure

```
├── apps/
│   ├── api/                          # Fastify REST API (port 4000)
│   │   └── src/
│   │       ├── domain/               # Entities · repository interfaces
│   │       │   ├── entities/OcrDocument.ts
│   │       │   └── repositories/IOcrRepository.ts
│   │       ├── application/
│   │       │   └── use-cases/ocr/
│   │       │       ├── UploadDocument.ts
│   │       │       └── ProcessDocument.ts
│   │       └── infrastructure/
│   │           ├── db/               # Drizzle schema
│   │           ├── storage/          # Local · S3 · R2 · MinIO adapters
│   │           ├── ocr/              # Tesseract · PDF.js engines
│   │           ├── llm/              # Anthropic · OpenAI adapters · StructuredExtractor
│   │           ├── repositories/     # OcrRepository (Drizzle implementation)
│   │           └── http/routes/      # ocr-documents.ts · ocr-config.ts
│   └── web/                          # React 18 frontend (port 3000)
│       └── src/features/ocr/
│           ├── OcrPage.tsx
│           ├── OcrDocumentPage.tsx
│           ├── OcrConfigPage.tsx
│           ├── OcrMetricsPage.tsx
│           ├── components/           # ConfidenceBadge · OcrResultViewer
│           └── hooks/                # useOcr · useOcrConfig (TanStack Query)
├── db/
│   ├── migrations/
│   │   ├── 0005_ocr_module.sql       # Core tables, enums, seed configs
│   │   └── 0006_ocr_webhooks.sql     # Webhook registry + delivery log
│   └── seed/
└── docs/ocr/                         # Full documentation (see below)
```

---

## Running Locally

### Prerequisites

- **Node.js ≥ 20**
- **pnpm ≥ 9** — `npm install -g pnpm`
- **PostgreSQL** — local install or [Docker](#postgresql-via-docker)

### 1 — Clone & install

```bash
git clone https://github.com/elviego/document_intel.git
cd document_intel
pnpm install
```

### 2 — PostgreSQL via Docker

Skip if you already have a local PostgreSQL instance running.

```bash
docker run -d \
  --name document-intel-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=document_intel \
  -p 5432:5432 \
  postgres:16-alpine
```

### 3 — Configure environment

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

**`apps/api/.env`**

```env
NODE_ENV=development
PORT=4000

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/document_intel
JWT_SECRET=<run: openssl rand -hex 32>

RESEND_API_KEY=re_...          # https://resend.com — free tier
EMAIL_FROM=noreply@example.com

CORS_ORIGIN=http://localhost:3000
APP_URL=http://localhost:3000

# File storage
OCR_UPLOAD_DIR=uploads/ocr
OCR_MAX_FILE_MB=50
STORAGE_PROVIDER=local
```

**`apps/web/.env.local`**

```env
VITE_API_URL=http://localhost:4000
```

### 4 — Run migrations

```bash
pnpm db:migrate
# Creates all 7 OCR tables and seeds default per-type configs
```

### 5 — Start dev servers

```bash
pnpm dev
# API  → http://localhost:4000
# Web  → http://localhost:3000
```

Or run individually:

```bash
pnpm --filter @document-intel/api dev
pnpm --filter @document-intel/web dev
```

### 6 — Create your first admin user

```bash
# Seed an admin account (adjust the script path as needed)
pnpm db:seed
```

Or call the invite endpoint directly:

```bash
curl -X POST http://localhost:4000/v1/auth/invite \
  -H "Content-Type: application/json" \
  -d '{ "email": "admin@example.com", "role": "admin", "name": "Admin" }'
```

### 7 — Configure an LLM provider _(optional)_

Open `http://localhost:3000/ocr/config` → **LLM Providers** → **+ Add provider**.  
Plain OCR works without an LLM — structured extraction is the optional second stage.

---

## Deploying to Production

### Railway (API) + Vercel (Web)

The recommended production setup: **Railway** hosts the API and PostgreSQL database, **Vercel** hosts the React frontend.

```
Browser → Vercel (static React) → Railway API → Railway PostgreSQL
                                              → S3 / R2 (files)
```

---

#### Step 1 — PostgreSQL on Railway

1. [railway.app](https://railway.app) → **New project** → **Provision PostgreSQL**
2. Click the PostgreSQL service → **Connect** tab → copy **`DATABASE_URL`**
3. Run migrations from your local machine:

```bash
DATABASE_URL=<copied url> pnpm db:migrate
```

---

#### Step 2 — API on Railway

1. In the same Railway project → **+ New service** → **GitHub repo** → select this repo
2. Railway auto-detects the `apps/api` package. If not, set:
   - **Root directory**: `apps/api`
   - **Build command**: `pnpm install && pnpm build`
   - **Start command**: `node dist/main.js`
3. Go to the API service → **Variables** → add all required variables:

```env
NODE_ENV=production
PORT=4000

DATABASE_URL=${{Postgres.DATABASE_URL}}   # Railway reference variable

JWT_SECRET=<openssl rand -hex 32>
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com

CORS_ORIGIN=https://your-app.vercel.app   # set after Vercel deploy
APP_URL=https://your-app.vercel.app

# Storage — use S3/R2 in production
STORAGE_PROVIDER=s3
S3_BUCKET=your-bucket
S3_REGION=auto
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com   # R2 only

OCR_MAX_FILE_MB=50
```

4. **Generate domain** → Railway service → **Settings** → **Networking** → **Generate Domain**  
   Copy the Railway API URL (e.g. `https://api-production-xxxx.up.railway.app`)

---

#### Step 3 — Web on Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → import this GitHub repo
2. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `apps/web`
   - **Build command**: `pnpm build`
   - **Output directory**: `dist`
3. **Environment Variables** → add:

```env
VITE_API_URL=https://api-production-xxxx.up.railway.app
```

4. Click **Deploy**. Vercel gives you a URL like `https://your-app.vercel.app`.

5. **Go back to Railway** → update `CORS_ORIGIN` and `APP_URL` to your Vercel URL → Railway redeploys automatically.

---

#### Step 4 — Custom domains _(optional)_

**Vercel**: Project → **Settings** → **Domains** → add `app.yourdomain.com`  
**Railway**: Service → **Settings** → **Networking** → **Custom Domain** → add `api.yourdomain.com`

Update `VITE_API_URL`, `CORS_ORIGIN`, and `APP_URL` to match.

---

#### Step 5 — Configure LLM providers

Open your Vercel URL → `/ocr/config` → **LLM Providers** → **+ Add provider**.

---

### Railway only (API + Web)

Host both API and web frontend on Railway as two separate services from the same repo.

#### API service — same as Step 2 above.

#### Web service

1. In the Railway project → **+ New service** → same GitHub repo
2. Set:
   - **Root directory**: `apps/web`
   - **Build command**: `pnpm install && pnpm build`
   - **Start command**: `npx serve dist -p $PORT`  
     _(install `serve`: add `"serve": "^14"` to `apps/web/package.json` devDependencies)_
3. **Variables**:

```env
VITE_API_URL=https://<api-service-railway-domain>
```

4. Generate a domain for the web service.
5. Update `CORS_ORIGIN` and `APP_URL` in the API service to the web domain.

---

### Environment variable reference

| Variable | Local | Railway API | Vercel Web |
|---|---|---|---|
| `DATABASE_URL` | local postgres | Railway reference | — |
| `JWT_SECRET` | any string | strong random | — |
| `RESEND_API_KEY` | optional | required | — |
| `CORS_ORIGIN` | `http://localhost:3000` | Vercel URL | — |
| `APP_URL` | `http://localhost:3000` | Vercel URL | — |
| `STORAGE_PROVIDER` | `local` | `s3` | — |
| `S3_*` | — | set if s3 | — |
| `OCR_MAX_FILE_MB` | `50` | `50` | — |
| `VITE_API_URL` | `http://localhost:4000` | — | Railway API URL |

---

## OcrResultMetadata Schema

Every processed document produces a structured result object stored as JSONB:

```json
{
  "$schema": "ocr-result/v1",
  "documentId": "018e1234-...",
  "jobId": "018e9999-...",
  "processedAt": "2025-03-15T10:23:45.123Z",
  "source": {
    "fileName": "invoice-march.pdf",
    "mimeType": "application/pdf",
    "fileSizeBytes": 245760,
    "pageCount": 2
  },
  "detection": {
    "documentType": "invoice",
    "autoDetected": true,
    "detectionConfidence": 0.97
  },
  "ocr": {
    "engine": "pdfjs",
    "engineVersion": "5.7.284",
    "language": "por+eng",
    "processingTimeMs": 1243,
    "overallConfidence": 0.92,
    "pages": [
      { "pageNumber": 1, "confidence": 0.94, "wordCount": 312, "rawText": "..." }
    ]
  },
  "llm": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-6",
    "processingTimeMs": 2180,
    "tokensUsed": 847
  },
  "structuredData": {
    "vendor": "ACME Lda",
    "invoiceNumber": "FT 2025/0042",
    "total": 1537.50,
    "currency": "EUR"
  },
  "validation": {
    "status": "valid",
    "issues": []
  }
}
```

Schema is inspired by **W3C Web Annotation** and **ISO/TS 8000** data quality conventions. See [docs/ocr/metadata-schema.md](docs/ocr/metadata-schema.md) for the full reference.

---

## API Overview

```
POST   /v1/ocr/documents              Upload single document
POST   /v1/ocr/documents/batch        Batch upload (207 multi-status)
GET    /v1/ocr/documents              List with filters + pagination
GET    /v1/ocr/documents/:id          Document + latest job result
GET    /v1/ocr/documents/:id/file     Serve raw file (stream / S3 redirect)
POST   /v1/ocr/documents/:id/process  Run OCR + LLM (with optional overrides)
GET    /v1/ocr/documents/:id/export   Download JSON or CSV result
DELETE /v1/ocr/documents/:id          Delete file + all records

GET    /v1/ocr/documents/metrics/aggregate   KPI totals
GET    /v1/ocr/documents/metrics/list        Raw metrics rows
GET    /v1/ocr/documents/metrics/trending    Time-series (daily aggregation)

GET    /v1/ocr/providers              List LLM providers
POST   /v1/ocr/providers              Create provider
PATCH  /v1/ocr/providers/:id          Update provider
PUT    /v1/ocr/providers/:id/default  Set as system default
DELETE /v1/ocr/providers/:id          Delete provider

GET    /v1/ocr/configs                Per-type OCR configs
PUT    /v1/ocr/configs/:documentType  Upsert config

GET    /v1/ocr/webhooks               List webhooks
POST   /v1/ocr/webhooks               Create webhook
PATCH  /v1/ocr/webhooks/:id           Update webhook
DELETE /v1/ocr/webhooks/:id           Delete webhook
```

---

## Documentation

| Page | Description |
|---|---|
| [Architecture](docs/ocr/architecture.md) | DDD layers, data flow diagrams, DB schema, engine selection |
| [API Reference](docs/ocr/api-reference.md) | All endpoints, request/response shapes, auth, error codes |
| [LLM Providers](docs/ocr/llm-providers.md) | Setup for all 5 provider types, extraction schemas, custom prompts |
| [Metadata Schema](docs/ocr/metadata-schema.md) | Full OcrResultMetadata field reference + CSV mapping |
| [Configuration](docs/ocr/configuration.md) | Env vars, migrations, per-type OCR settings, language codes |
| [Webhooks](docs/ocr/webhooks.md) | Events, HMAC signing, Node.js/Python verification, integrations |
| [Metrics & Analytics](docs/ocr/metrics.md) | KPI queries, trending SQL, cost estimation |
| [Deployment](docs/ocr/deployment.md) | Local · S3 · Cloudflare R2 · MinIO · Railway · Docker |

---

## Roles

| Role | Permissions |
|---|---|
| `admin` | Full access — upload, process, config, webhooks, delete |
| `staff` | Upload documents, trigger processing, view results |
| `accountant` | Read-only + export |

---

## Licence

MIT
