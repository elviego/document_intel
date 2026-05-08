import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/client.js'
import { WageRepository } from '../../repositories/WageRepository.js'
import { calculateWage } from '../../../domain/services/IrsCalculator.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const repo = new WageRepository(db)

const contractTypeEnum  = z.enum(['sem_termo', 'a_termo', 'rec_verdes', 'horas'])
const maritalStatusEnum = z.enum(['nao_casado', 'casado_2_titulares', 'casado_1_titular'])

const wageBody = z.object({
  employeeId:    z.string().uuid(),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  grossAmount:   z.number().positive(),
  contractType:  contractTypeEnum,
  maritalStatus: maritalStatusEnum,
  dependents:    z.number().int().min(0).max(20),
  notes:         z.string().optional(),
})

const previewBody = z.object({
  grossAmount:   z.number().positive(),
  contractType:  contractTypeEnum,
  maritalStatus: maritalStatusEnum,
  dependents:    z.number().int().min(0).max(20),
})

export const wageRoutes: FastifyPluginAsync = async (app) => {

  // Preview calculation without saving
  app.post('/preview', { preHandler: [requireAuth] }, async (req, reply) => {
    const { grossAmount, contractType, maritalStatus, dependents } = previewBody.parse(req.body)
    return reply.send(calculateWage(grossAmount, contractType, maritalStatus, dependents))
  })

  // Get all wages for an employee
  app.get('/employee/:employeeId', { preHandler: [requireAuth] }, async (req, reply) => {
    const { employeeId } = z.object({ employeeId: z.string().uuid() }).parse(req.params)
    return reply.send(await repo.findByEmployee(employeeId))
  })

  // Get latest (current) wage for an employee
  app.get('/employee/:employeeId/latest', { preHandler: [requireAuth] }, async (req, reply) => {
    const { employeeId } = z.object({ employeeId: z.string().uuid() }).parse(req.params)
    return reply.send(await repo.findLatest(employeeId))
  })

  // Save a wage record
  app.post('/', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    return reply.status(201).send(await repo.create(wageBody.parse(req.body)))
  })

  // Delete a wage record
  app.delete('/:id', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    await repo.delete(id)
    return reply.status(204).send()
  })
}
