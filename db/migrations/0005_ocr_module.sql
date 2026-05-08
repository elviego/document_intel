-- OCR Module: document types, processing jobs, metrics, LLM providers, per-type configs

CREATE TYPE ocr_document_type AS ENUM (
  'invoice', 'receipt', 'contract', 'id_document',
  'medical', 'bank_statement', 'form', 'other'
);

CREATE TYPE ocr_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TYPE llm_provider_type AS ENUM ('openai', 'anthropic', 'ollama', 'deepseek', 'custom');

-- LLM provider registry (stores credentials + model defaults)
CREATE TABLE ocr_llm_providers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  provider_type   llm_provider_type NOT NULL,
  base_url        TEXT,
  api_key         TEXT,
  default_model   TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  is_default      BOOLEAN NOT NULL DEFAULT false,
  config          TEXT,                          -- JSON: temperature, max_tokens, etc.
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Per-document-type OCR/LLM configuration
CREATE TABLE ocr_document_configs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type         ocr_document_type NOT NULL UNIQUE,
  ocr_engine            TEXT NOT NULL DEFAULT 'tesseract',
  ocr_language          TEXT NOT NULL DEFAULT 'por+eng',
  ocr_dpi               INTEGER DEFAULT 300,
  preprocessing_enabled BOOLEAN NOT NULL DEFAULT true,
  llm_provider_id       UUID REFERENCES ocr_llm_providers(id) ON DELETE SET NULL,
  llm_model             TEXT,
  llm_prompt_template   TEXT,
  structured_schema     TEXT,                   -- JSON: expected output schema definition
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Uploaded documents
CREATE TABLE ocr_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name        TEXT NOT NULL,
  file_path        TEXT NOT NULL,
  file_size_bytes  INTEGER NOT NULL,
  mime_type        TEXT NOT NULL,
  page_count       INTEGER,
  document_type    ocr_document_type,
  auto_detect_type BOOLEAN NOT NULL DEFAULT true,
  status           ocr_status NOT NULL DEFAULT 'pending',
  uploaded_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Processing job per document (one active job at a time; history via all rows)
CREATE TABLE ocr_jobs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id         UUID NOT NULL REFERENCES ocr_documents(id) ON DELETE CASCADE,
  status              ocr_status NOT NULL DEFAULT 'pending',
  ocr_engine          TEXT NOT NULL DEFAULT 'tesseract',
  ocr_engine_version  TEXT,
  llm_provider_id     UUID REFERENCES ocr_llm_providers(id) ON DELETE SET NULL,
  llm_model           TEXT,
  raw_text            TEXT,
  metadata            TEXT,                     -- JSON: full OCR result metadata per industry standard
  error_message       TEXT,
  started_at          TIMESTAMP,
  completed_at        TIMESTAMP,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Detailed metrics per job (append-only; drives dashboard)
CREATE TABLE ocr_metrics (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id               UUID NOT NULL REFERENCES ocr_jobs(id) ON DELETE CASCADE,
  document_id          UUID NOT NULL REFERENCES ocr_documents(id) ON DELETE CASCADE,
  overall_confidence   NUMERIC(5,4),
  page_confidences     TEXT,                    -- JSON array of per-page confidence
  character_count      INTEGER,
  word_count           INTEGER,
  processing_time_ms   INTEGER NOT NULL,
  ocr_engine           TEXT NOT NULL,
  ocr_engine_version   TEXT,
  llm_model            TEXT,
  llm_provider         TEXT,
  llm_tokens_used      INTEGER,
  document_type        ocr_document_type,
  auto_detected_type   BOOLEAN,
  created_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ocr_documents_status    ON ocr_documents(status);
CREATE INDEX idx_ocr_documents_type      ON ocr_documents(document_type);
CREATE INDEX idx_ocr_jobs_document       ON ocr_jobs(document_id);
CREATE INDEX idx_ocr_metrics_document    ON ocr_metrics(document_id);
CREATE INDEX idx_ocr_metrics_created_at  ON ocr_metrics(created_at);

-- Seed default per-type configs
INSERT INTO ocr_document_configs (document_type, ocr_engine, ocr_language)
SELECT unnest(ARRAY['invoice','receipt','contract','id_document','medical','bank_statement','form','other']::ocr_document_type[]),
       'tesseract',
       'por+eng';
