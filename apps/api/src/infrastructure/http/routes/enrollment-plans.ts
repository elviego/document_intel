import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/client.js'
import { EnrollmentPlanRepository } from '../../repositories/EnrollmentPlanRepository.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const repo = new EnrollmentPlanRepository(db)

const DEFAULT_PLANS = [
  { name: 'Tempo Integral',      description: 'Todos os dias úteis (5 dias/semana)',           scheduleType: 'full_time'          as const, daysPerWeek: 5,    morningsOnly: false, billingCycle: 'monthly' as const, baseAmount: 0 },
  { name: 'Part-time — 3 dias', description: '3 dias por semana à escolha',                   scheduleType: 'part_time_days'     as const, daysPerWeek: 3,    morningsOnly: false, billingCycle: 'monthly' as const, baseAmount: 0 },
  { name: 'Só de Manhãs',        description: 'Todos os dias úteis, apenas período da manhã',  scheduleType: 'part_time_mornings' as const, daysPerWeek: 5,    morningsOnly: true,  billingCycle: 'monthly' as const, baseAmount: 0 },
  { name: 'Plano Férias',        description: 'Frequência em períodos de férias escolares',    scheduleType: 'holiday'            as const, daysPerWeek: undefined, morningsOnly: false, billingCycle: 'monthly' as const, baseAmount: 0 },
]

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

  // Seed the 4 default plans if none exist yet
  app.post('/seed', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const existing = await repo.findAll(true)
    if (existing.length > 0) return reply.send({ seeded: 0, message: 'Plans already exist' })
    for (const plan of DEFAULT_PLANS) await repo.create(plan)
    return reply.status(201).send({ seeded: DEFAULT_PLANS.length })
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
