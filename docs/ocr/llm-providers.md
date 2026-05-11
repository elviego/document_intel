# LLM Providers

The OCR module uses a large language model as an optional second stage after raw text extraction. The LLM performs two tasks:

1. **Document type detection** — classifies the document and returns a confidence score
2. **Structured data extraction** — parses the OCR text into a typed JSON schema

LLM providers are configured at runtime through the admin UI (`/ocr/config`) or directly via the API. Multiple providers can be registered; one is marked as the **default** and used when no per-type override is set.

---

## Supported Providers

| Provider | Type | Protocol | Notes |
|---|---|---|---|
| **Anthropic (Claude)** | `anthropic` | Native SDK | Best for complex documents, long context |
| **OpenAI** | `openai` | OpenAI API | GPT-4o, GPT-4 Turbo, GPT-3.5 |
| **Ollama** | `ollama` | OpenAI-compatible | Fully local; no data leaves your server |
| **DeepSeek** | `deepseek` | OpenAI-compatible | Cost-effective; strong multilingual |
| **Custom endpoint** | `custom` | OpenAI-compatible | Any self-hosted or 3rd-party OAI-compatible API |

---

## Provider Selection Hierarchy

When processing a document, the system resolves which provider to use in this order:

```
1. Per-request override   (llmProviderId in POST /:id/process body)
2. Per-document-type config (ocr_document_configs.llmProviderId)
3. System default provider  (ocr_llm_providers WHERE is_default = true)
4. No LLM extraction       (skipped if no active provider found)
```

If no provider is reachable at any level, OCR still runs but `llm` and `structuredData` are `null` in the result metadata.

---

## Anthropic (Claude)

Best choice for high-accuracy extraction, long documents, and nuanced document types.

**Recommended models**

| Model | Context | Speed | Cost |
|---|---|---|---|
| `claude-opus-4-7` | 200k | Slower | Highest |
| `claude-sonnet-4-6` | 200k | Balanced | Medium |
| `claude-haiku-4-5-20251001` | 200k | Fast | Lowest |

**Configuration**

```json
{
  "name": "Anthropic Production",
  "providerType": "anthropic",
  "apiKey": "sk-ant-api03-...",
  "baseUrl": null,
  "defaultModel": "claude-sonnet-4-6",
  "isActive": true,
  "isDefault": true
}
```

**How it calls the API**

```typescript
// AnthropicProvider.ts
const response = await client.messages.create({
  model:      this.modelName,
  max_tokens: 4096,
  system:     systemPrompt,
  messages:   [{ role: 'user', content: userPrompt }],
})
// tokensUsed = input_tokens + output_tokens
```

**Notes**
- `baseUrl` is ignored for Anthropic — uses the official SDK endpoint
- The SDK version is `@anthropic-ai/sdk@0.95.1`
- Temperature is not configurable at this layer (uses API default, typically 1.0)

---

## OpenAI

**Recommended models**

| Model | Context | Speed | Cost |
|---|---|---|---|
| `gpt-4o` | 128k | Fast | Medium |
| `gpt-4-turbo` | 128k | Moderate | High |
| `gpt-4o-mini` | 128k | Fastest | Lowest |

**Configuration**

```json
{
  "name": "OpenAI Production",
  "providerType": "openai",
  "apiKey": "sk-proj-...",
  "baseUrl": null,
  "defaultModel": "gpt-4o",
  "isActive": true,
  "isDefault": false
}
```

**How it calls the API**

```typescript
// OpenAiCompatibleProvider.ts
const response = await client.chat.completions.create({
  model:       this.modelName,
  temperature: 0.1,
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: userPrompt  },
  ],
})
// tokensUsed = usage.total_tokens
```

---

## Ollama (Local LLM)

Run models entirely on your own hardware — no data leaves your server. Ideal for sensitive documents.

**Prerequisites**

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3.2
ollama pull mistral
ollama pull qwen2.5
```

**Configuration**

```json
{
  "name": "Ollama Local",
  "providerType": "ollama",
  "apiKey": "ollama",
  "baseUrl": "http://localhost:11434/v1",
  "defaultModel": "llama3.2",
  "isActive": true,
  "isDefault": false
}
```

**Recommended models for OCR extraction**

| Model | Size | Quality | Notes |
|---|---|---|---|
| `llama3.2` | 3B / 11B | Good | Meta's instruction-tuned model |
| `mistral` | 7B | Good | Strong structured output |
| `qwen2.5` | 7B | Very good | Excellent multilingual (Portuguese) |
| `deepseek-r1` | 7B–70B | Excellent | Strong reasoning for complex docs |
| `phi4` | 14B | Very good | Microsoft, efficient |

**Notes**
- `apiKey` must be set but is not validated by Ollama — any string works
- Default `baseUrl` if omitted: `http://localhost:11434/v1`
- Ollama must be running on the same machine as the API server (or accessible via network)
- Context window varies by model — large invoices/contracts may need a model with ≥32k context

---

## DeepSeek

Cost-effective frontier model with strong multilingual support, useful for Portuguese documents.

**Configuration**

```json
{
  "name": "DeepSeek",
  "providerType": "deepseek",
  "apiKey": "sk-...",
  "baseUrl": "https://api.deepseek.com/v1",
  "defaultModel": "deepseek-chat",
  "isActive": true,
  "isDefault": false
}
```

**Available models**

| Model | Notes |
|---|---|
| `deepseek-chat` | General purpose, fast |
| `deepseek-reasoner` | R1-style chain-of-thought; better for complex extraction |

---

## Custom OpenAI-Compatible Endpoint

Any service exposing the OpenAI Chat Completions API (`POST /chat/completions`) can be used.

**Examples**: vLLM, LM Studio, Groq, Together AI, Perplexity, Azure OpenAI

**Configuration**

```json
{
  "name": "Azure OpenAI",
  "providerType": "custom",
  "apiKey": "your-azure-api-key",
  "baseUrl": "https://my-resource.openai.azure.com/openai/deployments/my-deployment",
  "defaultModel": "gpt-4o",
  "isActive": true,
  "isDefault": false
}
```

```json
{
  "name": "Groq",
  "providerType": "custom",
  "apiKey": "gsk_...",
  "baseUrl": "https://api.groq.com/openai/v1",
  "defaultModel": "llama-3.1-70b-versatile",
  "isActive": true,
  "isDefault": false
}
```

---

## Structured Extraction

### Document Type Detection Prompt

When `autoDetectType=true` and no document type has been set, the LLM receives:

```
System:
  You are a document classification expert. Analyse the provided text
  and classify the document type. Respond ONLY with valid JSON in the format:
  { "type": "<type>", "confidence": <0-1> }
  Valid types: invoice, receipt, contract, id_document, medical,
               bank_statement, form, other

User:
  Classify this document:
  <first 2000 characters of OCR text>
```

### Extraction Schemas

Each document type has a pre-defined JSON schema used in the extraction prompt. Custom schemas can be overridden per document type via `structuredSchema` in the config.

#### Invoice

```json
{
  "vendor": "string",
  "invoiceNumber": "string",
  "date": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "lineItems": [
    { "description": "string", "quantity": "number", "unitPrice": "number", "total": "number" }
  ],
  "subtotal": "number",
  "taxRate": "number",
  "taxAmount": "number",
  "total": "number",
  "currency": "EUR",
  "paymentTerms": "string",
  "notes": "string"
}
```

#### Receipt

```json
{
  "merchant": "string",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "items": [
    { "description": "string", "quantity": "number", "price": "number" }
  ],
  "subtotal": "number",
  "tax": "number",
  "total": "number",
  "paymentMethod": "string",
  "receiptNumber": "string"
}
```

#### Contract

```json
{
  "parties": ["string"],
  "effectiveDate": "YYYY-MM-DD",
  "expirationDate": "YYYY-MM-DD",
  "contractType": "string",
  "keyTerms": ["string"],
  "obligations": { "party1": ["string"], "party2": ["string"] },
  "paymentTerms": "string",
  "jurisdiction": "string",
  "terminationClauses": ["string"]
}
```

#### ID Document

```json
{
  "documentType": "passport|national_id|driver_license",
  "fullName": "string",
  "dateOfBirth": "YYYY-MM-DD",
  "documentNumber": "string",
  "nationality": "string",
  "issueDate": "YYYY-MM-DD",
  "expiryDate": "YYYY-MM-DD",
  "issuingAuthority": "string",
  "address": "string"
}
```

#### Medical

```json
{
  "patientName": "string",
  "patientId": "string",
  "date": "YYYY-MM-DD",
  "provider": "string",
  "facility": "string",
  "diagnosis": ["string"],
  "procedures": ["string"],
  "prescriptions": [
    { "medication": "string", "dosage": "string", "frequency": "string" }
  ],
  "notes": "string",
  "followUp": "string"
}
```

#### Bank Statement

```json
{
  "bankName": "string",
  "accountHolder": "string",
  "accountNumber": "string",
  "iban": "string",
  "statementPeriod": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" },
  "openingBalance": "number",
  "closingBalance": "number",
  "currency": "EUR",
  "transactions": [
    { "date": "YYYY-MM-DD", "description": "string", "amount": "number", "balance": "number" }
  ]
}
```

#### Form

```json
{
  "formTitle": "string",
  "formId": "string",
  "submissionDate": "YYYY-MM-DD",
  "fields": [
    { "label": "string", "value": "string" }
  ]
}
```

#### Other

```json
{
  "raw": "<full OCR text>"
}
```

---

## Custom Prompt Templates

Each document type can have a custom `llmPromptTemplate` that appends additional instructions to the standard extraction prompt. Useful for domain-specific terminology or output formatting requirements.

**Example** — for Portuguese invoices with NIF (tax number):

```
Focus on Portuguese fiscal documents. Extract the NIF (Número de Identificação Fiscal)
for both vendor and client. The NIF is a 9-digit number often preceded by "NIF:" or
"Contribuinte:". Amounts use the European format (e.g. 1.234,56 EUR).
```

**Example** — for medical forms with custom fields:

```
This is a Tribo Verde school health declaration form. Extract fields including
"Autorização dos Pais", "Alergias conhecidas", and "Contacto de Emergência".
Return these in the fields array.
```

---

## Troubleshooting

### LLM returns invalid JSON

The `StructuredExtractor` wraps JSON parsing in a try/catch. On failure, it falls back to:

```json
{ "raw": "<full LLM response text>" }
```

The `validation.status` in the metadata will be `needs_review` and the issue will be logged in `validation.issues`.

### Model not found (Ollama)

```bash
# Check available models
curl http://localhost:11434/api/tags

# Pull the model configured in the provider
ollama pull llama3.2
```

### API key masked as `***`

API keys are masked in all list/get endpoints for security. To rotate a key, use `PATCH /v1/ocr/providers/:id` with the new `apiKey` value.

### Slow extraction on long documents

- Use `llmPromptTemplate` to instruct the model to focus on specific fields
- Consider switching to a faster model for the document type (e.g., Haiku instead of Sonnet for receipts)
- Text sent to the LLM is the full `rawText` — very long documents (50+ pages) may hit context limits
