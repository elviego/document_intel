-- OCR webhook registry: delivers HTTP callbacks on job events

CREATE TABLE ocr_webhooks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  url        TEXT NOT NULL,
  secret     TEXT,                -- used for HMAC-SHA256 signature header
  events     TEXT NOT NULL,       -- JSON array: ["job.completed","job.failed"]
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE ocr_webhook_deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id      UUID NOT NULL REFERENCES ocr_webhooks(id) ON DELETE CASCADE,
  event           TEXT NOT NULL,
  payload         TEXT NOT NULL,
  status          TEXT NOT NULL,      -- 'success' | 'failed'
  response_status INTEGER,
  error_message   TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_webhook ON ocr_webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_created ON ocr_webhook_deliveries(created_at);
