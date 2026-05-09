# Webhooks

Webhooks deliver real-time HTTP notifications to external systems when OCR events occur. Each delivery is signed with HMAC-SHA256 and logged to a persistent audit trail.

---

## Events

| Event | Triggered when |
|---|---|
| `document.uploaded` | File successfully stored, before OCR begins |
| `document.processing` | OCR engine starts (status changes to `processing`) |
| `document.completed` | Processing finished successfully, metadata available |
| `document.failed` | Processing failed; `errorMessage` is populated |
| `document.deleted` | Document and all associated data deleted |

---

## Payload Structure

Every webhook delivery sends a `POST` request with `Content-Type: application/json`.

```json
{
  "event": "document.completed",
  "documentId": "018e1234-abcd-7000-8000-000000000001",
  "status": "completed",
  "documentType": "invoice",
  "fileName": "invoice-march.pdf",
  "timestamp": "2025-03-15T10:23:45.123Z",
  "metadata": { /* full OcrResultMetadata — only on document.completed */ }
}
```

### Event-specific fields

| Event | Extra fields |
|---|---|
| `document.uploaded` | `fileName`, `mimeType`, `fileSizeBytes` |
| `document.processing` | `jobId` |
| `document.completed` | `jobId`, `metadata` (full OcrResultMetadata), `processingTimeMs` |
| `document.failed` | `jobId`, `errorMessage` |
| `document.deleted` | none extra |

---

## Request Headers

| Header | Value | Description |
|---|---|---|
| `Content-Type` | `application/json` | Always present |
| `X-OCR-Event` | e.g. `document.completed` | Event name |
| `X-OCR-Signature` | `sha256=<hex>` | HMAC-SHA256 signature (if secret configured) |
| `X-OCR-Delivery` | UUID | Unique delivery attempt ID |

---

## HMAC Signature Verification

When a webhook is configured with a `secret`, every delivery includes an `X-OCR-Signature` header. The signature is computed as:

```
HMAC-SHA256(secret, rawJsonBody)
```

Formatted as: `sha256=<lowercase hex digest>`

### Verification — Node.js

```typescript
import { createHmac, timingSafeEqual } from 'node:crypto'

function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = 'sha256=' + createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex')

  // Use timing-safe comparison to prevent timing attacks
  return timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )
}

// In your Express/Fastify handler:
app.post('/webhook', express.text({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['x-ocr-signature'] as string
  if (!verifySignature(req.body, sig, process.env.WEBHOOK_SECRET!)) {
    return res.status(401).send('Invalid signature')
  }
  const event = JSON.parse(req.body)
  // process event...
  res.sendStatus(200)
})
```

### Verification — Python

```python
import hmac
import hashlib

def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    expected = 'sha256=' + hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)

# In your Flask handler:
@app.route('/webhook', methods=['POST'])
def webhook():
    sig = request.headers.get('X-OCR-Signature', '')
    if not verify_signature(request.data, sig, os.environ['WEBHOOK_SECRET']):
        return 'Invalid signature', 401
    event = request.json
    # process event...
    return '', 200
```

---

## Delivery Behaviour

| Property | Value |
|---|---|
| Method | `POST` |
| Timeout | 10 seconds |
| Retries | None (fire-and-forget) |
| Concurrency | All active webhooks for an event are called in parallel |

Every delivery attempt — success or failure — is recorded in the `ocr_webhook_deliveries` table:

```sql
CREATE TABLE ocr_webhook_deliveries (
  id              UUID PRIMARY KEY,
  webhook_id      UUID REFERENCES ocr_webhooks(id) ON DELETE CASCADE,
  event           TEXT NOT NULL,
  payload         JSONB NOT NULL,
  status          TEXT NOT NULL,          -- 'success' | 'failed'
  response_status INTEGER,               -- HTTP status code received
  error_message   TEXT,                  -- network or timeout error
  created_at      TIMESTAMPTZ
);
```

---

## Configuring a Webhook

### Via Admin UI

1. Go to `/ocr/config` → **Webhooks** section
2. Click **+ Add webhook**
3. Fill in:
   - **Name** — human-readable label
   - **URL** — your endpoint (must be publicly reachable from the API server)
   - **Secret** — optional; used to compute `X-OCR-Signature`
   - **Events** — select one or more events to subscribe to
   - **Active** — toggle to enable/disable without deleting

### Via API

```bash
curl -X POST https://api.example.com/v1/ocr/webhooks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Webhook",
    "url": "https://my-app.com/hooks/ocr",
    "secret": "my-signing-secret",
    "events": ["document.completed", "document.failed"],
    "isActive": true
  }'
```

---

## Integration Examples

### Zapier

1. In Zapier, create a **Webhook trigger** (Catch Hook)
2. Copy the Zapier webhook URL
3. Create a webhook in OCR config with that URL and events `document.completed`
4. No secret needed (Zapier doesn't verify signatures)

### n8n

1. Add a **Webhook** node in n8n
2. Set Method: `POST`, Path: `/ocr`
3. Copy the test URL into OCR webhook config
4. Optionally add an **HTTP Request** → **Respond to Webhook** node pair with signature verification

### Make (Integromat)

1. Add a **Webhooks → Custom webhook** module
2. Copy the generated URL
3. Register it in OCR config

### Custom backend

```typescript
// Example: Save completed OCR results to your own database
import Fastify from 'fastify'
import { createHmac, timingSafeEqual } from 'node:crypto'

const app = Fastify()

app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  done(null, body)
})

app.post('/hooks/ocr', async (req, reply) => {
  const sig    = req.headers['x-ocr-signature'] as string
  const body   = req.body as string
  const secret = process.env.OCR_WEBHOOK_SECRET!

  // Verify signature
  const expected = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
  if (!timingSafeEqual(Buffer.from(sig ?? ''), Buffer.from(expected))) {
    return reply.status(401).send({ error: 'Invalid signature' })
  }

  const event = JSON.parse(body)

  if (event.event === 'document.completed') {
    const { documentId, documentType, metadata } = event
    await db.ocrResults.upsert({
      documentId,
      documentType,
      structuredData: metadata.structuredData,
      confidence: metadata.ocr.overallConfidence,
      processedAt: metadata.processedAt,
    })
  }

  return reply.send({ received: true })
})
```

---

## Troubleshooting

### Deliveries not arriving

1. Check the webhook is marked **Active** in the config
2. Verify the URL is publicly accessible from the API server (not `localhost` unless testing locally)
3. Check the `ocr_webhook_deliveries` table for error messages:

```sql
SELECT event, status, response_status, error_message, created_at
FROM ocr_webhook_deliveries
WHERE webhook_id = '<your-webhook-id>'
ORDER BY created_at DESC
LIMIT 20;
```

### Signature mismatch

- Ensure you are computing HMAC over the **raw request body bytes** (before JSON parsing)
- Do not pretty-print the body — the server sends compact JSON
- Use timing-safe comparison (`timingSafeEqual` / `hmac.compare_digest`)
- The `secret` is matched exactly — check for trailing whitespace in the stored secret

### Timeout errors

- The delivery timeout is 10 seconds. Ensure your endpoint responds within this window.
- For slow processing: respond `200` immediately, then process the event asynchronously.

### Replay a failed delivery

The system does not auto-retry. To replay, trigger re-processing:

```bash
curl -X POST /v1/ocr/documents/:id/process \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}'
```

This creates a new job and fires webhooks again on completion.
