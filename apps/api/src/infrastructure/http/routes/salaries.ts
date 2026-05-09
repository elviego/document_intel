import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/client.js'
import { SalaryRepository } from '../../repositories/SalaryRepository.js'
import { requireRole } from '../middleware/auth.js'

const salaryRepo = new SalaryRepository(db)

export const salaryRoutes: FastifyPluginAsync = async (app) => {

  app.get('/:schoolYearId', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const { schoolYearId } = z.object({ schoolYearId: z.string().uuid() }).parse(req.params)
    return reply.send(await salaryRepo.findByYear(schoolYearId))
  })

  app.post('/', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const body = z.object({
      schoolYearId: z.string().uuid(),
      personName:   z.string().min(1),
      salaryType:   z.enum(['contrato', 'rec_verdes', 'horas', 'terceiros']),
      serviceName:  z.string().nullable().default(null),
      baseAmount:   z.number(),
      actualAmount: z.number(),
      recurrence:   z.enum(['monthly', 'weekly', 'annual']).default('monthly'),
    }).parse(req.body)

    return reply.status(201).send(await salaryRepo.create({
      ...body,
      month: null,
      linkedTransactionId: null,
    }))
  })

  app.patch('/:id', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const body = z.object({
      personName:   z.string().min(1).optional(),
      salaryType:   z.enum(['contrato', 'rec_verdes', 'horas', 'terceiros']).optional(),
      serviceName:  z.string().nullable().optional(),
      baseAmount:   z.number().optional(),
      actualAmount: z.number().optional(),
      recurrence:   z.enum(['monthly', 'weekly', 'annual']).optional(),
    }).parse(req.body)
    return reply.send(await salaryRepo.update(id, body))
  })

  app.delete('/:id', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    await salaryRepo.delete(id)
    return reply.status(204).send()
  })
}
