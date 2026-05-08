import type { IOcrRepository } from '../../../domain/repositories/IOcrRepository.js'
import type { OcrDocumentType, OcrResultMetadata } from '../../../domain/entities/OcrDocument.js'
import { pickEngine } from '../../../infrastructure/ocr/OcrEngineFactory.js'
import { buildLlmProvider } from '../../../infrastructure/llm/LlmProviderFactory.js'
import { StructuredExtractor } from '../../../infrastructure/llm/StructuredExtractor.js'
import { NotFoundError } from '../../../shared/errors.js'

export class ProcessDocument {
  constructor(private readonly repo: IOcrRepository) {}

  async execute(documentId: string): Promise<OcrResultMetadata> {
    const doc = await this.repo.findDocumentById(documentId)
    if (!doc) throw new NotFoundError('Document')

    const config = doc.documentType
      ? await this.repo.findConfigByType(doc.documentType)
      : null

    const ocrEngine = pickEngine(doc.mimeType, config?.ocrEngine ?? 'tesseract')
    const language  = config?.ocrLanguage ?? 'por+eng'

    // Create job record
    const job = await this.repo.createJob({
      documentId,
      ocrEngine: ocrEngine.name,
      llmProviderId: config?.llmProviderId ?? undefined,
    })

    await this.repo.updateJob(job.id, { status: 'processing', startedAt: new Date() })
    await this.repo.updateDocumentStatus(documentId, 'processing')

    const totalStart = Date.now()

    try {
      // ── Step 1: OCR ──────────────────────────────────────────────────────────
      const ocrStart  = Date.now()
      const ocrResult = await ocrEngine.recognize(doc.filePath, language)
      const ocrMs     = Date.now() - ocrStart

      // ── Step 2: Resolve document type ────────────────────────────────────────
      let documentType:        OcrDocumentType = doc.documentType ?? 'other'
      let autoDetected                         = false
      let detectionConfidence: number | null   = null
      let llmTotalMs                           = 0
      let llmTokensUsed                        = 0
      let llmModel:  string | null             = null
      let llmProv:   string | null             = null
      let structured: Record<string, unknown> | null = null

      // Resolve LLM provider (config-specific or system default)
      const providerRecord = config?.llmProviderId
        ? await this.repo.findProviderById(config.llmProviderId)
        : await this.repo.findDefaultProvider()

      if (providerRecord?.isActive) {
        const llmInstance = buildLlmProvider(providerRecord)
        const extractor   = new StructuredExtractor(llmInstance)
        llmModel = providerRecord.defaultModel
        llmProv  = providerRecord.providerType

        // ── Step 2a: Auto-detect type ─────────────────────────────────────────
        if (doc.autoDetectType && !doc.documentType) {
          const llmDetectStart = Date.now()
          const detected = await extractor.detectDocumentType(ocrResult.rawText)
          llmTotalMs += Date.now() - llmDetectStart
          llmTokensUsed += detected.tokensUsed
          documentType        = detected.documentType
          autoDetected        = true
          detectionConfidence = detected.confidence
          llmModel            = detected.model
        }

        // ── Step 2b: Structured extraction ────────────────────────────────────
        const llmExtractStart = Date.now()
        const extraction = await extractor.extract(
          ocrResult.rawText,
          documentType,
          config?.llmPromptTemplate ?? undefined,
        )
        llmTotalMs    += Date.now() - llmExtractStart
        llmTokensUsed += extraction.tokensUsed
        structured    = extraction.structuredData
        llmModel      = extraction.model
      }

      const totalMs = Date.now() - totalStart

      // ── Step 3: Build metadata ────────────────────────────────────────────────
      const metadata: OcrResultMetadata = {
        $schema:    'ocr-result/v1',
        documentId,
        jobId:      job.id,
        processedAt: new Date().toISOString(),
        source: {
          fileName:      doc.fileName,
          mimeType:      doc.mimeType,
          fileSizeBytes: doc.fileSizeBytes,
          pageCount:     ocrResult.pages.length,
        },
        detection: {
          documentType,
          autoDetected,
          detectionConfidence,
        },
        ocr: {
          engine:            ocrEngine.name,
          engineVersion:     ocrResult.engineVersion,
          language,
          processingTimeMs:  ocrMs,
          overallConfidence: ocrResult.overallConfidence,
          pages:             ocrResult.pages,
        },
        llm: llmModel ? {
          provider:        llmProv ?? '',
          model:           llmModel,
          processingTimeMs: llmTotalMs,
          tokensUsed:      llmTokensUsed,
        } : null,
        structuredData: structured,
        validation: {
          status: 'valid',
          issues: [],
        },
      }

      // ── Step 4: Persist ───────────────────────────────────────────────────────
      await this.repo.updateJob(job.id, {
        status:           'completed',
        rawText:          ocrResult.rawText,
        metadata,
        completedAt:      new Date(),
        ocrEngineVersion: ocrResult.engineVersion,
        llmModel:         llmModel ?? undefined,
      })

      await this.repo.updateDocumentStatus(documentId, 'completed', documentType, ocrResult.pages.length)

      await this.repo.createMetric({
        jobId:             job.id,
        documentId,
        overallConfidence: ocrResult.overallConfidence,
        pageConfidences:   ocrResult.pages.map(p => p.confidence),
        characterCount:    ocrResult.rawText.length,
        wordCount:         ocrResult.rawText.split(/\s+/).filter(Boolean).length,
        processingTimeMs:  totalMs,
        ocrEngine:         ocrEngine.name,
        ocrEngineVersion:  ocrResult.engineVersion,
        llmModel:          llmModel ?? undefined,
        llmProvider:       llmProv ?? undefined,
        llmTokensUsed:     llmTokensUsed || undefined,
        documentType,
        autoDetectedType:  autoDetected,
      })

      return metadata
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await this.repo.updateJob(job.id, {
        status:       'failed',
        errorMessage: msg,
        completedAt:  new Date(),
      })
      await this.repo.updateDocumentStatus(documentId, 'failed')
      throw err
    }
  }
}
