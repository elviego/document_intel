import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/client'
import { BudgetRepository }     from '../../repositories/BudgetRepository'
import { SchoolYearRepository } from '../../repositories/SchoolYearRepository'
import { CopyBudget }           from '../../../application/use-cases/budget/CopyBudget'
import { requireAuth, requireRole } from '../middleware/auth'

const budgetRepo     = new BudgetRepository(db)
const schoolYearRepo = new SchoolYearRepository(db)

export const budgetRoutes: FastifyPluginAsync = async (app) => {

  app.get('/:schoolYearId', { preHandler: [requireAuth] }, async (req, reply) => {
    const { schoolYearId } = z.object({ schoolYearId: z.string().uuid() }).parse(req.params)
    return reply.send(await budgetRepo.findByYear(schoolYearId))
  })

  app.put('/', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const body = z.object({
      schoolYearId:  z.string().uuid(),
      categoryId:    z.string().uuid(),
      month:         z.number().int().min(1).max(12),
      plannedAmount: z.number(),
    }).parse(req.body)
    return reply.send(await budgetRepo.upsert(body))
  })

  app.post('/copy', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const body = z.object({ fromYearId: z.string().uuid(), toYearId: z.string().uuid() }).parse(req.body)
    const count = await new CopyBudget(schoolYearRepo, budgetRepo).execute(body.fromYearId, body.toYearId)
    return reply.send({ copied: count })
  })
}
