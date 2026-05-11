import type { ILlmProvider } from './ILlmProvider.js'
import type { OcrDocumentType } from '../../domain/entities/OcrDocument.js'

const SYSTEM_PROMPT = `You are a document data extraction assistant.
Given raw OCR text from a document, extract structured data as a single JSON object.
Return ONLY valid JSON. No markdown, no explanation.`

const DETECT_SYSTEM = `You are a document classifier.
Identify the document type from the raw text and return a JSON object with:
{ "documentType": "<type>", "confidence": <0-1 float> }
Valid types: invoice, receipt, contract, id_document, medical, bank_statement, form, other.
Return ONLY valid JSON.`

const SCHEMAS: Record<OcrDocumentType, string> = {
  invoice: `{
  "vendor": "string",
  "invoiceNumber": "string",
  "date": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "lineItems": [{"description":"string","quantity":number,"unitPrice":number,"total":number}],
  "subtotal": number,
  "taxRate": number,
  "taxAmount": number,
  "total": number,
  "currency": "string",
  "paymentTerms": "string",
  "notes": "string"
}`,
  receipt: `{
  "merchant": "string",
  "date": "YYYY-MM-DD",
  "items": [{"description":"string","quantity":number,"price":number}],
  "subtotal": number,
  "taxAmount": number,
  "total": number,
  "currency": "string",
  "paymentMethod": "string"
}`,
  contract: `{
  "parties": ["string"],
  "effectiveDate": "YYYY-MM-DD",
  "expirationDate": "YYYY-MM-DD",
  "title": "string",
  "keyTerms": ["string"],
  "jurisdiction": "string"
}`,
  id_document: `{
  "documentType": "string",
  "fullName": "string",
  "dateOfBirth": "YYYY-MM-DD",
  "documentNumber": "string",
  "issuingCountry": "string",
  "issuingAuthority": "string",
  "issueDate": "YYYY-MM-DD",
  "expiryDate": "YYYY-MM-DD"
}`,
  medical: `{
  "patient": "string",
  "provider": "string",
  "date": "YYYY-MM-DD",
  "diagnosis": ["string"],
  "medications": [{"name":"string","dosage":"string","frequency":"string"}],
  "notes": "string"
}`,
  bank_statement: `{
  "bank": "string",
  "accountHolder": "string",
  "accountNumber": "string",
  "period": {"from":"YYYY-MM-DD","to":"YYYY-MM-DD"},
  "openingBalance": number,
  "closingBalance": number,
  "transactions": [{"date":"YYYY-MM-DD","description":"string","amount":number,"balance":number}]
}`,
  form: `{
  "formTitle": "string",
  "fields": {"fieldName": "fieldValue"}
}`,
  other: `{
  "keyValuePairs": {"key": "value"},
  "summary": "string"
}`,
}

export interface ExtractionResult {
  structuredData: Record<string, unknown>
  tokensUsed:     number
  model:          string
}

export interface DetectionResult {
  documentType: OcrDocumentType
  confidence:   number
  tokensUsed:   number
  model:        string
}

export class StructuredExtractor {
  constructor(private readonly llm: ILlmProvider) {}

  async detectDocumentType(rawText: string): Promise<DetectionResult> {
    const snippet = rawText.slice(0, 2000)
    const res = await this.llm.complete(DETECT_SYSTEM, `Document text:\n${snippet}`)
    try {
      const parsed = JSON.parse(res.content.trim()) as { documentType: OcrDocumentType; confidence: number }
      return {
        documentType: parsed.documentType ?? 'other',
        confidence:   parsed.confidence   ?? 0,
        tokensUsed:   res.tokensUsed,
        model:        res.model,
      }
    } catch {
      return { documentType: 'other', confidence: 0, tokensUsed: res.tokensUsed, model: res.model }
    }
  }

  async extract(rawText: string, documentType: OcrDocumentType, customPrompt?: string): Promise<ExtractionResult> {
    const schema    = SCHEMAS[documentType] ?? SCHEMAS.other
    const userParts = customPrompt
      ? `${customPrompt}\n\nDocument text:\n${rawText}`
      : `Extract data from this ${documentType} document.\nExpected JSON schema:\n${schema}\n\nDocument text:\n${rawText}`

    const res = await this.llm.complete(SYSTEM_PROMPT, userParts)

    let structuredData: Record<string, unknown> = {}
    try {
      structuredData = JSON.parse(res.content.trim()) as Record<string, unknown>
    } catch {
      structuredData = { raw: res.content }
    }

    return { structuredData, tokensUsed: res.tokensUsed, model: res.model }
  }
}
