import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/client.js'
import { MealRepository }     from '../../repositories/MealRepository.js'
import { MealBillingService } from '../../../domain/services/MealBillingService.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const repo    = new MealRepository(db)
const billing = new MealBillingService()

export const mealRoutes: FastifyPluginAsync = async (app) => {

  app.get('/children/:schoolYearId', { preHandler: [requireAuth] }, async (req, reply) => {
    const { schoolYearId } = z.object({ schoolYearId: z.string().uuid() }).parse(req.params)
    return reply.send(await repo.findChildren(schoolYearId))
  })

  app.post('/children', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const body = z.object({
      fullName: z.string().min(1), schoolYearId: z.string().uuid(),
      tuitionType: z.string(), isActive: z.boolean().default(true),
    }).parse(req.body)
    return reply.status(201).send(await repo.createChild(body))
  })

  app.patch('/children/:id', { preHandler: [requireRole('admin', 'staff')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const body = z.object({
      fullName: z.string().optional(), tuitionType: z.string().optional(), isActive: z.boolean().optional(),
    }).parse(req.body)
    return reply.send(await repo.updateChild(id, body))
  })

  app.get('/records', { preHandler: [requireAuth] }, async (req, reply) => {
    const q = z.object({
      childId: z.string().uuid().optional(),
      from:    z.string().optional(),
      to:      z.string().optional(),
    }).parse(req.query)
    return reply.send(await repo.findRecords(
      q.childId,
      q.from ? new Date(q.from) : undefined,
      q.to   ? new Date(q.to)   : undefined,
    ))
  })

  app.post('/records', { preHandler: [requireRole('admin', 'staff')] }, async (req, reply) => {
    const user = req.user as { sub: string }
    const body = z.object({
      childId:  z.string().uuid(),
      date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      mealType: z.enum(['com_sopa', 'sem_sopa']),
    }).parse(req.body)
    return reply.status(201).send(await repo.createRecord({
      childId: body.childId, date: new Date(body.date),
      mealType: body.mealType, billed: false, createdBy: user.sub,
    }))
  })

  app.delete('/records/:id', { preHandler: [requireRole('admin', 'staff')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    await repo.deleteRecord(id)
    return reply.status(204).send()
  })

  app.get('/pricing/:schoolYearId', { preHandler: [requireAuth] }, async (req, reply) => {
    const { schoolYearId } = z.object({ schoolYearId: z.string().uuid() }).parse(req.params)
    return reply.send(await repo.findPricing(schoolYearId))
  })

  app.put('/pricing', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const body = z.object({
      schoolYearId: z.string().uuid(),
      mealType:     z.enum(['com_sopa', 'sem_sopa']),
      schoolCost:   z.number().positive(),
      parentPrice:  z.number().positive(),
    }).parse(req.body)
    return reply.send(await repo.upsertPricing(body))
  })

  app.get('/billing/:schoolYearId/:year/:month', { preHandler: [requireAuth] }, async (req, reply) => {
    const { schoolYearId, year, month } = z.object({
      schoolYearId: z.string().uuid(),
      year:  z.coerce.number().int(),
      month: z.coerce.number().int().min(1).max(12),
    }).parse(req.params)
    const [childList, pricing, records] = await Promise.all([
      repo.findChildren(schoolYearId),
      repo.findPricing(schoolYearId),
      repo.findRecords(undefined, new Date(year, month - 1, 1), new Date(year, month, 0)),
    ])
    return reply.send(billing.calculate(records, pricing, childList, month, year))
  })
}
