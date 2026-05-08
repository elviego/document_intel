import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/client.js'
import { OcrRepository } from '../../repositories/OcrRepository.js'
import { UploadDocument } from '../../../application/use-cases/ocr/UploadDocument.js'
import { ProcessDocument } from '../../../application/use-cases/ocr/ProcessDocument.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ValidationError, NotFoundError } from '../../../shared/errors.js'
import { env } from '../../../shared/env.js'

const repo = new OcrRepository(db)

export const ocrDocumentRoutes: FastifyPluginAsync = async (app) => {

  // POST /v1/ocr/documents  — upload a document
  app.post('/', { preHandler: [requireRole('admin', 'staff')] }, async (req, reply) => {
    const file = await req.file({ limits: { fileSize: env.OCR_MAX_FILE_MB * 1024 * 1024 } })
    if (!file) throw new ValidationError('No file uploaded')

    const buffer = await file.toBuffer()

    const autoDetectType = file.fields['autoDetectType']
      ? (file.fields['autoDetectType'] as any).value !== 'false'
      : true

    const rawType = (file.fields['documentType'] as any)?.value ?? null
    const validTypes = ['invoice','receipt','contract','id_document','medical','bank_statement','form','other']
    const documentType = rawType && validTypes.includes(rawType) ? rawType : undefined

    const user = req.user as { sub: string }

    const useCase = new UploadDocument(repo)
    const doc = await useCase.execute({
      fileName:       file.filename,
      mimeType:       file.mimetype,
      buffer,
      autoDetectType,
      documentType,
      uploadedBy:     user.sub,
      uploadDir:      env.OCR_UPLOAD_DIR,
      maxFileMb:      env.OCR_MAX_FILE_MB,
    })

    return reply.status(201).send(doc)
  })

  // GET /v1/ocr/documents  — list documents
  app.get('/', { preHandler: [requireAuth] }, async (req, reply) => {
    const q = z.object({
      limit:  z.coerce.number().int().min(1).max(200).default(50),
      offset: z.coerce.number().int().min(0).default(0),
    }).parse(req.query)

    const result = await repo.listDocuments(q)
    return reply.send(result)
  })

  // GET /v1/ocr/documents/:id  — get document + latest job result
  app.get('/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const doc = await repo.findDocumentById(id)
    if (!doc) throw new NotFoundError('Document')

    const job = await repo.findLatestJobForDocument(id)
    return reply.send({ document: doc, job })
  })

  // POST /v1/ocr/documents/:id/process  — trigger OCR processing
  app.post('/:id/process', { preHandler: [requireRole('admin', 'staff')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const metadata = await new ProcessDocument(repo).execute(id)
    return reply.send(metadata)
  })

  // DELETE /v1/ocr/documents/:id  — delete document record (file kept)
  app.delete('/:id', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const doc = await repo.findDocumentById(id)
    if (!doc) throw new NotFoundError('Document')
    // Note: physical file deletion is intentionally omitted for audit trail
    await repo.updateDocumentStatus(id, 'failed')
    return reply.status(204).send()
  })

  // GET /v1/ocr/metrics  — aggregate metrics dashboard
  app.get('/metrics/aggregate', { preHandler: [requireRole('admin')] }, async (_req, reply) => {
    const agg = await repo.metricsAggregate()
    return reply.send(agg)
  })

  // GET /v1/ocr/metrics/list  — raw metrics list
  app.get('/metrics/list', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const q = z.object({
      limit:      z.coerce.number().int().min(1).max(500).default(100),
      offset:     z.coerce.number().int().min(0).default(0),
      documentId: z.string().uuid().optional(),
    }).parse(req.query)
    const rows = await repo.listMetrics(q)
    return reply.send(rows)
  })
}
