import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/client.js'
import { EmployeeRepository } from '../../repositories/EmployeeRepository.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const repo = new EmployeeRepository(db)

const employeeBody = z.object({
  fullName:     z.string().min(1),
  position:     z.string().default(''),
  contractType: z.enum(['contrato', 'rec_verdes', 'horas', 'terceiros']).default('contrato'),
  email:        z.string().email().optional(),
  phone:        z.string().optional(),
  nif:          z.string().optional(),
  iban:         z.string().optional(),
  baseSalary:   z.number().default(0),
  startDate:    z.string().optional(),
  endDate:      z.string().optional(),
  notes:        z.string().optional(),
})

export const employeeRoutes: FastifyPluginAsync = async (app) => {

  app.get('/', { preHandler: [requireAuth] }, async (_req, reply) => {
    return reply.send(await repo.findAll(true))
  })

  app.get('/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const emp = await repo.findById(id)
    if (!emp) return reply.status(404).send({ error: 'Employee not found' })
    return reply.send(emp)
  })

  app.post('/', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const body = employeeBody.parse(req.body)
    return reply.status(201).send(await repo.create(body))
  })

  app.put('/:id', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const body = employeeBody.partial().extend({ isActive: z.boolean().optional() }).parse(req.body)
    return reply.send(await repo.update(id, body))
  })

  app.delete('/:id', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    await repo.delete(id)
    return reply.status(204).send()
  })
}
