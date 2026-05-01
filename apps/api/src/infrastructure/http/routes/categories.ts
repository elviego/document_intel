import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/client'
import { CategoryRepository } from '../../repositories/CategoryRepository'
import { requireAuth, requireRole } from '../middleware/auth'

const repo = new CategoryRepository(db)

export const categoryRoutes: FastifyPluginAsync = async (app) => {

  app.get('/', { preHandler: [requireAuth] }, async (req, reply) => {
    const { includeInactive } = z.object({ includeInactive: z.coerce.boolean().default(false) }).parse(req.query)
    return reply.send(await repo.findAll(includeInactive))
  })

  app.post('/', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const body = z.object({
      namePt: z.string().min(1), nameEn: z.string().min(1),
      classification: z.enum(['receita', 'despesa']),
      groupPt: z.string(), groupEn: z.string(),
      descriptionPt: z.string().optional(), descriptionEn: z.string().optional(),
    }).parse(req.body)
    return reply.status(201).send(await repo.create(body))
  })

  app.patch('/:id', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const body = z.object({
      namePt: z.string().optional(), nameEn: z.string().optional(),
      classification: z.enum(['receita', 'despesa']).optional(),
      groupPt: z.string().optional(), groupEn: z.string().optional(),
      descriptionPt: z.string().optional(), descriptionEn: z.string().optional(),
      isActive: z.boolean().optional(),
    }).parse(req.body)
    return reply.send(await repo.update(id, body))
  })

  app.post('/import', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const body = z.array(z.object({
      namePt: z.string(), nameEn: z.string(),
      classification: z.enum(['receita', 'despesa']),
      groupPt: z.string(), groupEn: z.string(),
      descriptionPt: z.string().optional(), descriptionEn: z.string().optional(),
    })).parse(req.body)
    const result = await repo.bulkUpsert(body)
    return reply.send({ upserted: result.length })
  })
}
