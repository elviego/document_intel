import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/client.js'
import { OcrRepository } from '../../repositories/OcrRepository.js'
import { NotFoundError } from '../../../shared/errors.js'

const repo = new OcrRepository(db)

const providerTypeEnum = z.enum(['openai', 'anthropic', 'ollama', 'deepseek', 'custom'])
const docTypeEnum      = z.enum(['invoice','receipt','contract','id_document','medical','bank_statement','form','other'])

export const ocrConfigRoutes: FastifyPluginAsync = async (app) => {

  // ── LLM Providers ───────────────────────────────────────────────────────────

  // GET /v1/ocr/providers
  app.get('/providers', async (_req, reply) => {
    const providers = await repo.listProviders()
    // Never expose raw API keys in the list
    return reply.send(providers.map(p => ({ ...p, apiKey: p.apiKey ? '***' : null })))
  })

  // POST /v1/ocr/providers
  app.post('/providers', async (req, reply) => {
    const body = z.object({
      name:         z.string().min(1).max(100),
      providerType: providerTypeEnum,
      baseUrl:      z.string().url().optional().nullable(),
      apiKey:       z.string().optional().nullable(),
      defaultModel: z.string().min(1),
      isActive:     z.boolean().default(true),
      isDefault:    z.boolean().default(false),
      config:       z.record(z.unknown()).optional().nullable(),
    }).parse(req.body)

    const provider = await repo.createProvider({
      ...body,
      baseUrl:  body.baseUrl  ?? null,
      apiKey:   body.apiKey   ?? null,
      config:   body.config   ?? null,
      isActive: body.isActive,
      isDefault: body.isDefault,
    })
    return reply.status(201).send({ ...provider, apiKey: provider.apiKey ? '***' : null })
  })

  // PATCH /v1/ocr/providers/:id
  app.patch('/providers/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const body = z.object({
      name:         z.string().min(1).max(100).optional(),
      providerType: providerTypeEnum.optional(),
      baseUrl:      z.string().url().optional().nullable(),
      apiKey:       z.string().optional().nullable(),
      defaultModel: z.string().min(1).optional(),
      isActive:     z.boolean().optional(),
      config:       z.record(z.unknown()).optional().nullable(),
    }).parse(req.body)

    const provider = await repo.updateProvider(id, body as any)
    return reply.send({ ...provider, apiKey: provider.apiKey ? '***' : null })
  })

  // PUT /v1/ocr/providers/:id/default  — set as default
  app.put('/providers/:id/default', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const existing = await repo.findProviderById(id)
    if (!existing) throw new NotFoundError('LLM provider')
    await repo.setDefaultProvider(id)
    return reply.status(204).send()
  })

  // DELETE /v1/ocr/providers/:id
  app.delete('/providers/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    await repo.deleteProvider(id)
    return reply.status(204).send()
  })

  // ── Document-type configs ────────────────────────────────────────────────────

  // GET /v1/ocr/configs
  app.get('/configs', async (_req, reply) => {
    return reply.send(await repo.listConfigs())
  })

  // GET /v1/ocr/configs/:documentType
  app.get('/configs/:documentType', async (req, reply) => {
    const { documentType } = z.object({ documentType: docTypeEnum }).parse(req.params)
    const cfg = await repo.findConfigByType(documentType)
    if (!cfg) throw new NotFoundError('Config')
    return reply.send(cfg)
  })

  // PUT /v1/ocr/configs/:documentType  — upsert
  app.put('/configs/:documentType', async (req, reply) => {
    const { documentType } = z.object({ documentType: docTypeEnum }).parse(req.params)
    const body = z.object({
      ocrEngine:            z.string().min(1).optional(),
      ocrLanguage:          z.string().min(1).optional(),
      ocrDpi:               z.number().int().min(72).max(1200).optional().nullable(),
      preprocessingEnabled: z.boolean().optional(),
      llmProviderId:        z.string().uuid().optional().nullable(),
      llmModel:             z.string().optional().nullable(),
      llmPromptTemplate:    z.string().optional().nullable(),
      structuredSchema:     z.record(z.unknown()).optional().nullable(),
    }).parse(req.body)

    const cfg = await repo.upsertConfig(documentType, body as any)
    return reply.send(cfg)
  })

  // ── Webhooks ─────────────────────────────────────────────────────────────────

  const webhookBody = z.object({
    name:     z.string().min(1).max(100),
    url:      z.string().url(),
    secret:   z.string().optional().nullable(),
    events:   z.array(z.string()).min(1),
    isActive: z.boolean().default(true),
  })

  // GET /v1/ocr/webhooks
  app.get('/webhooks', async (_req, reply) => {
    return reply.send(await repo.listWebhooks())
  })

  // POST /v1/ocr/webhooks
  app.post('/webhooks', async (req, reply) => {
    const body = webhookBody.parse(req.body)
    const wh   = await repo.createWebhook({ ...body, secret: body.secret ?? null })
    return reply.status(201).send(wh)
  })

  // PATCH /v1/ocr/webhooks/:id
  app.patch('/webhooks/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const body   = webhookBody.partial().parse(req.body)
    const wh     = await repo.updateWebhook(id, { ...body, secret: body.secret ?? undefined })
    return reply.send(wh)
  })

  // DELETE /v1/ocr/webhooks/:id
  app.delete('/webhooks/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    await repo.deleteWebhook(id)
    return reply.status(204).send()
  })
}
