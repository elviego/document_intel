# OCR Module — Document Intelligence

The OCR module provides end-to-end document processing: upload, optical character recognition, AI-powered structured data extraction, and analytics. It is fully integrated into the Tribo Verde platform as a first-class module accessible to `admin` and `staff` roles.

---

## Documentation Index

| Page | Description |
|---|---|
| [Architecture](./architecture.md) | System design, component diagram, data flow, DDD layers |
| [API Reference](./api-reference.md) | All HTTP endpoints, request/response shapes, auth requirements |
| [LLM Providers](./llm-providers.md) | Configuring Anthropic, OpenAI, Ollama, DeepSeek, and custom endpoints |
| [Metadata Schema](./metadata-schema.md) | OcrResultMetadata standard (W3C/ISO-TS 8000 inspired) |
| [Configuration](./configuration.md) | Environment variables, per-document-type OCR settings |
| [Webhooks](./webhooks.md) | Event notifications, HMAC signing, delivery audit log |
| [Metrics & Analytics](./metrics.md) | Confidence tracking, time-series charts, KPI dashboard |
| [Deployment](./deployment.md) | Local storage vs S3/R2/MinIO, Railway, Docker |

---

## Overview

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
        │ Use Cases                                    │ Events
┌───────▼───────────┐   ┌──────────────────┐  ┌───────▼──────────┐
│  UploadDocument   │   │  ProcessDocument  │  │  WebhookDelivery │
└───────────────────┘   └────────┬─────────┘  └──────────────────┘
                                 │
               ┌─────────────────┼────────────────────┐
               │                 │                    │
    ┌──────────▼──────┐ ┌────────▼───────┐ ┌─────────▼────────┐
    │   OCR Engine    │ │  LLM Provider  │ │  File Storage    │
    │ Tesseract (img) │ │ Anthropic      │ │  Local filesystem │
    │ PDFjs  (text)   │ │ OpenAI         │ │  S3 / R2 / MinIO │
    │ PDFjs+Tesseract │ │ Ollama (local) │ └──────────────────┘
    │   (scanned PDF) │ │ DeepSeek       │
    └─────────────────┘ │ Custom OAI     │
                        └────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  PostgreSQL (Railway)    │
                    │  ocr_documents           │
                    │  ocr_jobs                │
                    │  ocr_metrics             │
                    │  ocr_llm_providers       │
                    │  ocr_document_configs    │
                    │  ocr_webhooks            │
                    │  ocr_webhook_deliveries  │
                    └─────────────────────────┘
```

---

## Core Capabilities

### Document Ingestion
- Single or batch file upload (drag-and-drop UI or API)
- Supported formats: **PDF, PNG, JPEG, TIFF, BMP, WebP**
- Max file size configurable via `OCR_MAX_FILE_MB` (default 50 MB)
- Automatic document type detection **or** manual selection from 8 categories

### OCR Processing
| Input | Engine | Notes |
|---|---|---|
| Images (PNG/JPEG/TIFF/BMP/WebP) | **Tesseract.js** | Language packs configurable per document type |
| PDF with text layer | **PDF.js** | Direct text extraction, no GPU needed |
| Scanned PDF | **PDF.js + Tesseract** | Pages rendered at 2× scale → image OCR |

### Structured Extraction
An optional LLM step follows OCR to extract structured JSON from raw text:
- **Auto-detection** of document type (with confidence score)
- **Type-specific schemas** for all 8 document categories
- **Custom prompt templates** configurable per document type
- **Provider-level configuration** (Anthropic, OpenAI, Ollama, DeepSeek, Custom)

### Document Types

| Type | Key Extracted Fields |
|---|---|
| `invoice` | vendor, invoiceNumber, date, lineItems, subtotal, tax, total, currency |
| `receipt` | merchant, date, items, total, paymentMethod |
| `contract` | parties, effectiveDate, expirationDate, keyTerms, obligations, jurisdiction |
| `id_document` | fullName, dateOfBirth, documentNumber, nationality, issueDate, expiryDate |
| `medical` | patientName, date, diagnosis, prescriptions, provider |
| `bank_statement` | accountNumber, period, openingBalance, closingBalance, transactions |
| `form` | title, fields (key-value pairs), submissionDate |
| `other` | raw extracted text |

---

## Quick Start

### 1. Apply migrations

```bash
pnpm db:migrate
# Runs 0005_ocr_module.sql + 0006_ocr_webhooks.sql
# Seeds default configs for all 8 document types
```

### 2. Configure environment

```env
# Minimum required
OCR_UPLOAD_DIR=uploads/ocr
OCR_MAX_FILE_MB=50
STORAGE_PROVIDER=local

# Add at least one LLM provider via the /ocr/config UI
# or seed directly into ocr_llm_providers
```

### 3. Open the UI

| Route | Description |
|---|---|
| `/ocr` | Document list, upload |
| `/ocr/:id` | Document detail, preview, export, re-process |
| `/ocr/config` | LLM providers, per-type settings, webhooks |
| `/ocr/metrics` | Analytics dashboard, trending charts |

---

## Feature Matrix

| Feature | Status |
|---|---|
| Single file upload | ✅ |
| Batch upload (multi-file) | ✅ |
| PDF text extraction | ✅ |
| Scanned PDF (image OCR) | ✅ |
| Auto document type detection | ✅ |
| Structured data extraction | ✅ |
| Per-type OCR/LLM config | ✅ |
| In-browser document preview | ✅ |
| Re-process with override | ✅ |
| Export JSON / CSV | ✅ |
| Metrics & analytics | ✅ |
| Quality trending charts | ✅ |
| Webhook notifications | ✅ |
| HMAC-signed webhook payloads | ✅ |
| Local file storage | ✅ |
| S3 / Cloudflare R2 / MinIO | ✅ |
| Anthropic Claude support | ✅ |
| OpenAI support | ✅ |
| Ollama (local LLM) support | ✅ |
| DeepSeek support | ✅ |
| Custom OpenAI-compatible endpoint | ✅ |
