import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/client.js'
import { EnrollmentPlanRepository } from '../../repositories/EnrollmentPlanRepository.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const repo = new EnrollmentPlanRepository(db)

const planBody = z.object({
  name:            z.string().min(1),
  description:     z.string().optional(),
  scheduleType:    z.enum(['full_time', 'part_time_days', 'part_time_mornings', 'holiday', 'custom']),
  daysPerWeek:     z.number().int().min(1).max(7).optional(),
  morningsOnly:    z.boolean().optional(),
  billingCycle:    z.enum(['monthly', 'trimestral', 'annual']).optional(),
  baseAmount:      z.number().min(0),
  discountPercent: z.number().min(0).max(100).optional(),
  discountFixed:   z.number().min(0).optional(),
})

export const enrollmentPlanRoutes: FastifyPluginAsync = async (app) => {

  app.get('/', { preHandler: [requireAuth] }, async (req, reply) => {
    const { includeInactive } = z.object({ includeInactive: z.coerce.boolean().default(false) }).parse(req.query)
    return reply.send(await repo.findAll(includeInactive))
  })

  app.post('/', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    return reply.status(201).send(await repo.create(planBody.parse(req.body)))
  })

  app.put('/:id', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const body   = planBody.partial().extend({ isActive: z.boolean().optional() }).parse(req.body)
    return reply.send(await repo.update(id, body))
  })

  app.delete('/:id', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    await repo.delete(id)
    return reply.status(204).send()
  })
}
