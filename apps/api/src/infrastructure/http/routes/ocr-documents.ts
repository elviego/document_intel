import { createReadStream } from 'node:fs'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/client.js'
import { OcrRepository } from '../../repositories/OcrRepository.js'
import { UploadDocument } from '../../../application/use-cases/ocr/UploadDocument.js'
import { ProcessDocument } from '../../../application/use-cases/ocr/ProcessDocument.js'
import { getFileStorage } from '../../storage/FileStorageFactory.js'
import { ValidationError, NotFoundError } from '../../../shared/errors.js'
import { register, cancel as cancelProcessing, unregister } from './processing-registry.js'
import { env } from '../../../shared/env.js'
import type { OcrDocumentType } from '../../../domain/entities/OcrDocument.js'

const repo    = new OcrRepository(db)
const storage = getFileStorage()

const VALID_DOC_TYPES = ['invoice','receipt','contract','id_document','medical','bank_statement','form','other']

function parseDocType(raw: unknown): OcrDocumentType | undefined {
  return (raw && VALID_DOC_TYPES.includes(raw as string)) ? raw as OcrDocumentType : undefined
}

export const ocrDocumentRoutes: FastifyPluginAsync = async (app) => {

  // ── Upload single document ────────────────────────────────────────────────
  app.post('/', async (req, reply) => {
    const file = await req.file({ limits: { fileSize: env.OCR_MAX_FILE_MB * 1024 * 1024 } })
    if (!file) throw new ValidationError('No file uploaded')

    const buffer        = await file.toBuffer()
    const autoDetect    = (file.fields['autoDetectType'] as any)?.value !== 'false'
    const documentType  = parseDocType((file.fields['documentType'] as any)?.value)
    const autoProcess   = (file.fields['autoProcess'] as any)?.value === 'true'

    const doc = await new UploadDocument(repo, storage).execute({
      fileName: file.filename, mimeType: file.mimetype, buffer,
      autoDetectType: autoDetect, documentType, uploadedBy: null,
      maxFileMb: env.OCR_MAX_FILE_MB,
    })

    if (autoProcess) {
      const ctrl = register(doc.id)
      new ProcessDocument(repo, storage).execute(doc.id, undefined, ctrl.signal)
        .catch(() => {}).finally(() => unregister(doc.id))
    }

    return reply.status(201).send(doc)
  })

  // ── Batch upload ──────────────────────────────────────────────────────────
  app.post('/batch', async (req, reply) => {
    const parts = req.files({ limits: { fileSize: env.OCR_MAX_FILE_MB * 1024 * 1024 } })
    const results: { fileName: string; id?: string; error?: string }[] = []

    for await (const part of parts) {
      try {
        const buffer = await part.toBuffer()
        const fields = (part as any).fields ?? {}
        const autoDetect   = fields['autoDetectType']?.value !== 'false'
        const documentType = parseDocType(fields['documentType']?.value)
        const autoProcess  = fields['autoProcess']?.value === 'true'

        const doc = await new UploadDocument(repo, storage).execute({
          fileName: part.filename, mimeType: part.mimetype, buffer,
          autoDetectType: autoDetect, documentType, uploadedBy: null,
          maxFileMb: env.OCR_MAX_FILE_MB,
        })

        if (autoProcess) {
          const ctrl = register(doc.id)
          new ProcessDocument(repo, storage).execute(doc.id, undefined, ctrl.signal)
            .catch(() => {}).finally(() => unregister(doc.id))
        }

        results.push({ fileName: part.filename, id: doc.id })
      } catch (err) {
        results.push({ fileName: part.filename, error: err instanceof Error ? err.message : String(err) })
      }
    }

    return reply.status(207).send({ results })
  })

  // ── List documents ────────────────────────────────────────────────────────
  app.get('/', async (req, reply) => {
    const q = z.object({
      limit:  z.coerce.number().int().min(1).max(200).default(50),
      offset: z.coerce.number().int().min(0).default(0),
      status: z.enum(['pending','processing','completed','failed']).optional(),
      documentType: z.enum(['invoice','receipt','contract','id_document','medical','bank_statement','form','other']).optional(),
    }).parse(req.query)
    return reply.send(await repo.listDocuments(q))
  })

  // ── Get document + latest job ─────────────────────────────────────────────
  app.get('/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const doc    = await repo.findDocumentById(id)
    if (!doc) throw new NotFoundError('Document')
    const job = await repo.findLatestJobForDocument(id)
    return reply.send({ document: doc, job })
  })

  // ── List all jobs for a document ─────────────────────────────────────────
  app.get('/:id/jobs', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const doc = await repo.findDocumentById(id)
    if (!doc) throw new NotFoundError('Document')
    const jobs = await repo.listJobsForDocument(id)
    return reply.send(jobs)
  })

  // ── Serve raw file (for preview) ─────────────────────────────────────────
  app.get('/:id/file', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const doc    = await repo.findDocumentById(id)
    if (!doc) throw new NotFoundError('Document')

    if (storage.provider === 's3') {
      const url = await storage.getServeUrl(doc.filePath, 3600)
      return reply.redirect(url, 302)
    }

    try {
      const stream = createReadStream(doc.filePath)
      return reply
        .header('Content-Type', doc.mimeType)
        .header('Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName)}"`)
        .send(stream)
    } catch {
      throw new NotFoundError('File')
    }
  })

  // ── Process with optional override ───────────────────────────────────────
  app.post('/:id/process', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const body   = z.object({
      documentType:  z.enum(['invoice','receipt','contract','id_document','medical','bank_statement','form','other']).optional(),
      llmProviderId: z.string().uuid().optional(),
      llmModel:      z.string().optional(),
    }).optional().parse(req.body)

    const doc = await repo.findDocumentById(id)
    if (!doc) throw new NotFoundError('Document')

    const ctrl = register(id)
    new ProcessDocument(repo, storage).execute(id, body ?? undefined, ctrl.signal)
      .catch(() => {}).finally(() => unregister(id))
    return reply.status(202).send({ documentId: id, status: 'processing' })
  })

  // ── Cancel active processing ──────────────────────────────────────────────
  app.post('/:id/cancel', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const aborted = cancelProcessing(id)
    if (aborted) {
      const job = await repo.findLatestJobForDocument(id)
      if (job && (job.status === 'processing' || job.status === 'pending')) {
        await repo.updateJob(job.id, {
          status: 'failed', errorMessage: 'Cancelled by user', completedAt: new Date(),
        })
      }
      await repo.updateDocumentStatus(id, 'failed')
    }
    return reply.status(204).send()
  })

  // ── Export result ────────────────────────────────────────────────────────
  app.get('/:id/export', async (req, reply) => {
    const { id }     = z.object({ id: z.string().uuid() }).parse(req.params)
    const { format } = z.object({ format: z.enum(['json','csv']).default('json') }).parse(req.query)

    const doc = await repo.findDocumentById(id)
    if (!doc) throw new NotFoundError('Document')
    const job = await repo.findLatestJobForDocument(id)
    if (!job?.metadata) throw new NotFoundError('OCR result')

    const baseName = doc.fileName.replace(/\.[^.]+$/, '')

    if (format === 'json') {
      return reply
        .header('Content-Type', 'application/json')
        .header('Content-Disposition', `attachment; filename="${baseName}-ocr.json"`)
        .send(JSON.stringify(job.metadata, null, 2))
    }

    const { metadata } = job
    const rows: string[][] = [
      ['field', 'value'],
      ['documentId',        metadata.documentId],
      ['processedAt',       metadata.processedAt],
      ['documentType',      metadata.detection.documentType],
      ['autoDetected',      String(metadata.detection.autoDetected)],
      ['ocrEngine',         metadata.ocr.engine],
      ['ocrConfidence',     String(metadata.ocr.overallConfidence)],
      ['ocrProcessingMs',   String(metadata.ocr.processingTimeMs)],
      ['llmModel',          metadata.llm?.model ?? ''],
      ['llmProvider',       metadata.llm?.provider ?? ''],
      ['llmTokensUsed',     String(metadata.llm?.tokensUsed ?? '')],
      ['pages',             String(metadata.ocr.pages.length)],
      ['validationStatus',  metadata.validation.status],
    ]

    if (metadata.structuredData) {
      for (const [k, v] of Object.entries(metadata.structuredData)) {
        rows.push([`data.${k}`, typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')])
      }
    }

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', `attachment; filename="${baseName}-ocr.csv"`)
      .send(csv)
  })

  // ── Delete document ──────────────────────────────────────────────────────
  app.delete('/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const doc = await repo.findDocumentById(id)
    if (!doc) throw new NotFoundError('Document')
    await storage.delete(doc.filePath).catch(() => {})
    await repo.deleteDocument(id)
    return reply.status(204).send()
  })

  // ── Metrics aggregate ────────────────────────────────────────────────────
  app.get('/metrics/aggregate', async (_req, reply) => {
    return reply.send(await repo.metricsAggregate())
  })

  // ── Metrics list ─────────────────────────────────────────────────────────
  app.get('/metrics/list', async (req, reply) => {
    const q = z.object({
      limit:      z.coerce.number().int().min(1).max(500).default(100),
      offset:     z.coerce.number().int().min(0).default(0),
      documentId: z.string().uuid().optional(),
    }).parse(req.query)
    return reply.send(await repo.listMetrics(q))
  })

  // ── Metrics trending ─────────────────────────────────────────────────────
  app.get('/metrics/trending', async (req, reply) => {
    const q = z.object({
      days:         z.coerce.number().int().min(1).max(365).default(30),
      documentType: z.enum(['invoice','receipt','contract','id_document','medical','bank_statement','form','other']).optional(),
    }).parse(req.query)
    return reply.send(await repo.metricsTrending(q.days, q.documentType as OcrDocumentType | undefined))
  })
}
