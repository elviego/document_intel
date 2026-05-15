import type { IOcrRepository } from '../../../domain/repositories/IOcrRepository.js'
import type { OcrDocumentType, OcrResultMetadata } from '../../../domain/entities/OcrDocument.js'
import type { IFileStorage } from '../../../infrastructure/storage/IFileStorage.js'
import { pickEngine } from '../../../infrastructure/ocr/OcrEngineFactory.js'
import { buildLlmProvider } from '../../../infrastructure/llm/LlmProviderFactory.js'
import { StructuredExtractor } from '../../../infrastructure/llm/StructuredExtractor.js'
import { NotFoundError } from '../../../shared/errors.js'

export interface ProcessOverride {
  documentType?:  OcrDocumentType
  llmProviderId?: string
  llmModel?:      string
}

export class ProcessDocument {
  constructor(
    private readonly repo:    IOcrRepository,
    private readonly storage: IFileStorage,
  ) {}

  async execute(documentId: string, override?: ProcessOverride): Promise<OcrResultMetadata> {
    const doc = await this.repo.findDocumentById(documentId)
    if (!doc) throw new NotFoundError('Document')

    const effectiveType = override?.documentType ?? doc.documentType
    const config = effectiveType
      ? await this.repo.findConfigByType(effectiveType)
      : null

    const ocrEngine = pickEngine(doc.mimeType, config?.ocrEngine ?? 'tesseract')
    const language  = config?.ocrLanguage ?? 'por+eng'

    console.log(`[OCR:process] documentId=${documentId} mimeType=${doc.mimeType} engine=${ocrEngine.name} language=${language} effectiveType=${effectiveType ?? 'none'} autoDetect=${doc.autoDetectType}`)

    // For S3/remote storage, we need a local file path — download to tmp
    const filePath = await this.resolveFilePath(doc.filePath, doc.mimeType)
    console.log(`[OCR:process] resolvedFilePath=${filePath} storageProvider=${this.storage.provider}`)

    const job = await this.repo.createJob({
      documentId,
      ocrEngine:     ocrEngine.name,
      llmProviderId: override?.llmProviderId ?? config?.llmProviderId ?? undefined,
    })

    await this.repo.updateJob(job.id, { status: 'processing', startedAt: new Date() })
    await this.repo.updateDocumentStatus(documentId, 'processing')

    const totalStart = Date.now()

    try {
      // ── Step 1: OCR ──────────────────────────────────────────────────────────
      const ocrStart  = Date.now()
      console.log(`[OCR:process] step1: starting OCR with engine=${ocrEngine.name}`)
      const ocrResult = await ocrEngine.recognize(filePath, language)
      const ocrMs     = Date.now() - ocrStart
      console.log(`[OCR:process] step1: OCR done in ${ocrMs}ms engineVersion=${ocrResult.engineVersion} overallConfidence=${ocrResult.overallConfidence.toFixed(3)} rawTextLength=${ocrResult.rawText.length} pages=${ocrResult.pages.length}`)
      if (!ocrResult.rawText || ocrResult.rawText.trim().length === 0) {
        console.warn('[OCR:process] step1: WARNING — rawText is empty after OCR')
      } else {
        console.log(`[OCR:process] step1: rawText sample="${ocrResult.rawText.slice(0, 120).replace(/\n/g, '↵')}"`)
      }

      // ── Step 2: Resolve document type ────────────────────────────────────────
      let documentType: OcrDocumentType = effectiveType ?? doc.documentType ?? 'other'
      let autoDetected                         = false
      let detectionConfidence: number | null   = null
      let llmTotalMs                           = 0
      let llmTokensUsed                        = 0
      let llmModel:  string | null             = null
      let llmProv:   string | null             = null
      let structured: Record<string, unknown> | null = null

      // Resolve LLM provider (override → config → system default)
      const resolvedProviderId = override?.llmProviderId ?? config?.llmProviderId
      const providerRecord = resolvedProviderId
        ? await this.repo.findProviderById(resolvedProviderId)
        : await this.repo.findDefaultProvider()

      console.log(`[OCR:process] step2: resolvedProviderId=${resolvedProviderId ?? 'none'} providerFound=${!!providerRecord} providerActive=${providerRecord?.isActive ?? false}`)
      if (!providerRecord) console.warn('[OCR:process] step2: no LLM provider found — skipping structured extraction')
      else if (!providerRecord.isActive) console.warn(`[OCR:process] step2: provider ${providerRecord.id} is inactive — skipping structured extraction`)

      if (providerRecord?.isActive) {
        const llmInstance = buildLlmProvider(providerRecord)
        const extractor   = new StructuredExtractor(llmInstance)
        llmModel = override?.llmModel ?? config?.llmModel ?? providerRecord.defaultModel
        llmProv  = providerRecord.providerType

        // ── Step 2a: Auto-detect type ─────────────────────────────────────────
        if (doc.autoDetectType && !effectiveType) {
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

      await this.deliverWebhooks('job.completed', { documentId, jobId: job.id, metadata })
      return metadata
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await this.repo.updateJob(job.id, {
        status:       'failed',
        errorMessage: msg,
        completedAt:  new Date(),
      })
      await this.repo.updateDocumentStatus(documentId, 'failed')
      await this.deliverWebhooks('job.failed', { documentId, jobId: job.id, error: msg })
      throw err
    }
  }

  private async deliverWebhooks(event: string, payload: Record<string, unknown>): Promise<void> {
    const webhooks = await this.repo.listActiveWebhooks().catch(() => [])
    const body     = JSON.stringify({ event, ...payload, ts: new Date().toISOString() })

    await Promise.allSettled(
      webhooks
        .filter(w => w.events.includes(event) || w.events.includes('*'))
        .map(async (wh) => {
          let status: 'success' | 'failed' = 'failed'
          let responseStatus: number | undefined
          let errorMessage: string | undefined
          try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' }
            if (wh.secret) {
              const { createHmac } = await import('node:crypto')
              headers['X-OCR-Signature'] = `sha256=${createHmac('sha256', wh.secret).update(body).digest('hex')}`
            }
            const res = await fetch(wh.url, { method: 'POST', headers, body, signal: AbortSignal.timeout(10_000) })
            responseStatus = res.status
            status = res.ok ? 'success' : 'failed'
            if (!res.ok) errorMessage = `HTTP ${res.status}`
          } catch (e) {
            errorMessage = e instanceof Error ? e.message : String(e)
          }
          await this.repo.createWebhookDelivery({
            webhookId: wh.id, event, payload: body, status, responseStatus, errorMessage,
          }).catch(() => {})
        }),
    )
  }

  // If the storage is S3/remote, download to a tmp file so OCR engines can read it
  private async resolveFilePath(storagePath: string, mimeType: string): Promise<string> {
    if (this.storage.provider === 'local') return storagePath

    const { writeFile, unlink } = await import('node:fs/promises')
    const { join } = await import('node:path')
    const { tmpdir } = await import('node:os')
    const { randomUUID } = await import('node:crypto')

    const ext     = mimeType === 'application/pdf' ? '.pdf' : '.img'
    const tmpPath = join(tmpdir(), `ocr-${randomUUID()}${ext}`)
    const buffer  = await this.storage.read(storagePath)
    await writeFile(tmpPath, buffer)
    return tmpPath
  }
}
