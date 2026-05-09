# Metrics & Analytics

The OCR module tracks processing quality and performance metrics for every job. All metrics are append-only — reprocessing a document adds a new row rather than overwriting.

---

## Data Model

Each completed or failed job writes one row to `ocr_metrics`:

```sql
CREATE TABLE ocr_metrics (
  id                  UUID PRIMARY KEY,
  job_id              UUID NOT NULL REFERENCES ocr_jobs(id),
  document_id         UUID NOT NULL REFERENCES ocr_documents(id) ON DELETE CASCADE,
  overall_confidence  DECIMAL(4,3),     -- 0.000 – 1.000
  page_confidences    JSONB,            -- number[] e.g. [0.94, 0.91, 0.87]
  character_count     INTEGER,
  word_count          INTEGER,
  processing_time_ms  INTEGER NOT NULL,
  ocr_engine          TEXT NOT NULL,    -- 'tesseract' | 'pdfjs' | 'pdfjs+tesseract'
  ocr_engine_version  TEXT,
  llm_model           TEXT,
  llm_provider        TEXT,
  llm_tokens_used     INTEGER,
  document_type       ocr_document_type,
  auto_detected_type  BOOLEAN,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Indexes: `document_id`, `created_at`, `document_type` — all used in aggregate queries.

---

## KPI Dashboard

Accessible at `/ocr/metrics`. Queries `GET /v1/ocr/documents/metrics/aggregate`.

### Aggregate Query

```sql
SELECT
  COUNT(DISTINCT document_id)                           AS total_documents,
  AVG(overall_confidence)                               AS avg_confidence,
  AVG(processing_time_ms)                               AS avg_processing_ms,

  -- By engine
  json_agg(DISTINCT jsonb_build_object('engine', ocr_engine, 'count', engine_count))
    AS by_engine,

  -- By document type
  json_agg(DISTINCT jsonb_build_object('documentType', document_type, 'count', type_count))
    AS by_doc_type,

  -- By LLM model
  json_agg(DISTINCT jsonb_build_object('model', llm_model, 'count', model_count))
    AS by_llm_model

FROM ocr_metrics;
```

### KPI Cards

| KPI | Description |
|---|---|
| **Total processed** | Distinct document count across all metric rows |
| **Avg. confidence** | Mean OCR confidence across all jobs (0–100%) |
| **Avg. processing time** | Mean total processing time in milliseconds |
| **LLM models used** | Number of distinct models seen |

### Distribution Charts

Three horizontal bar charts (Recharts `BarChart`, `layout="vertical"`):

| Chart | Groups by |
|---|---|
| By OCR Engine | `ocr_engine` — tesseract / pdfjs / pdfjs+tesseract |
| By Document Type | `document_type` — 8 categories |
| By LLM Model | `llm_model` — exact model name string |

---

## Quality Trending

Time-series view at the bottom of `/ocr/metrics`. Queries `GET /v1/ocr/documents/metrics/trending`.

### Database Query

```sql
SELECT
  to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
  AVG(overall_confidence)                               AS avg_confidence,
  COUNT(*)                                              AS count,
  AVG(processing_time_ms)                               AS avg_processing_ms
FROM ocr_metrics
WHERE created_at >= NOW() - INTERVAL '<days> days'
  AND ($documentType IS NULL OR document_type = $documentType)
GROUP BY date
ORDER BY date ASC;
```

### UI Controls

| Control | Options | Default |
|---|---|---|
| Date range | 7d / 30d / 90d | 30d |
| Document type filter | All + 8 types | All |

### Trend Charts

Two `LineChart` components (Recharts):

**Confidence over time** — `avgConfidence × 100` plotted as percentage  
- Y-axis: 0–100%  
- Null values (days with no data) are connected across with `connectNulls`  
- Color: indigo (`#4f46e5`)

**Documents per day** — raw count of jobs  
- Y-axis: integer (no decimals)  
- Color: green (`#059669`)

---

## Raw Metrics Table

Shows the 100 most recent metric rows. Queries `GET /v1/ocr/documents/metrics/list`.

Can be filtered by `documentId` to see the reprocessing history for a single document.

### Columns

| Column | Source |
|---|---|
| Date | `createdAt` formatted `dd/MM/yy HH:mm` |
| Doc type | `documentType` |
| Engine | `ocrEngine` |
| LLM model | `llmModel` (or —) |
| Confidence | `overallConfidence` — color-coded badge |
| Words | `wordCount` |
| Chars | `characterCount` |
| Time (ms) | `processingTimeMs` |
| Tokens | `llmTokensUsed` |
| Auto? | `autoDetectedType` — Yes / No / — |

---

## Confidence Badge

The `ConfidenceBadge` component renders confidence as a colored percentage:

| Range | Color | Label |
|---|---|---|
| ≥ 80% | Green | Good quality |
| 50–79% | Amber | Review recommended |
| < 50% | Red | Poor quality — consider re-scan |
| null | Gray | — (not computed) |

---

## Querying Metrics Directly

For custom reporting, query the `ocr_metrics` table via PostgreSQL:

### Confidence by document type (last 30 days)

```sql
SELECT
  document_type,
  COUNT(*)                            AS jobs,
  ROUND(AVG(overall_confidence), 3)   AS avg_confidence,
  ROUND(MIN(overall_confidence), 3)   AS min_confidence,
  ROUND(MAX(overall_confidence), 3)   AS max_confidence
FROM ocr_metrics
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND overall_confidence IS NOT NULL
GROUP BY document_type
ORDER BY avg_confidence DESC;
```

### Token usage by model (month)

```sql
SELECT
  llm_provider,
  llm_model,
  COUNT(*)              AS jobs,
  SUM(llm_tokens_used)  AS total_tokens,
  AVG(llm_tokens_used)  AS avg_tokens_per_job
FROM ocr_metrics
WHERE created_at >= DATE_TRUNC('month', NOW())
  AND llm_model IS NOT NULL
GROUP BY llm_provider, llm_model
ORDER BY total_tokens DESC;
```

### Processing time percentiles

```sql
SELECT
  ocr_engine,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY processing_time_ms) AS p50_ms,
  PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY processing_time_ms) AS p90_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY processing_time_ms) AS p99_ms
FROM ocr_metrics
GROUP BY ocr_engine;
```

### Low-confidence documents needing review

```sql
SELECT
  d.file_name,
  d.document_type,
  m.overall_confidence,
  m.created_at
FROM ocr_metrics m
JOIN ocr_documents d ON d.id = m.document_id
WHERE m.overall_confidence < 0.5
  AND m.created_at >= NOW() - INTERVAL '7 days'
ORDER BY m.overall_confidence ASC;
```

### Daily volume and quality (CSV-friendly)

```sql
SELECT
  to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
  COUNT(*)                                               AS documents,
  ROUND(AVG(overall_confidence) * 100, 1)               AS avg_confidence_pct,
  SUM(llm_tokens_used)                                   AS total_tokens,
  ROUND(AVG(processing_time_ms) / 1000.0, 2)            AS avg_seconds
FROM ocr_metrics
GROUP BY day
ORDER BY day DESC
LIMIT 90;
```

---

## Cost Estimation

Use token metrics to estimate LLM costs per provider:

### Anthropic (Claude) — approximate rates

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|---|---|---|
| claude-opus-4-7 | $15.00 | $75.00 |
| claude-sonnet-4-6 | $3.00 | $15.00 |
| claude-haiku-4-5 | $0.25 | $1.25 |

```sql
-- Estimated cost for Anthropic (assuming 70% input / 30% output split)
SELECT
  SUM(llm_tokens_used) AS total_tokens,
  ROUND(
    SUM(llm_tokens_used) * 0.70 / 1000000 * 3.00 +   -- input @ Sonnet rate
    SUM(llm_tokens_used) * 0.30 / 1000000 * 15.00,   -- output @ Sonnet rate
  4) AS estimated_usd
FROM ocr_metrics
WHERE llm_provider = 'anthropic'
  AND llm_model LIKE '%sonnet%'
  AND created_at >= DATE_TRUNC('month', NOW());
```

> Adjust multipliers to match actual model pricing from the provider's pricing page.
