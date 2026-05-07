import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/client.js'
import { BankAccountRepository } from '../../repositories/BankAccountRepository.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const repo = new BankAccountRepository(db)

export const bankAccountRoutes: FastifyPluginAsync = async (app) => {

  app.get('/', { preHandler: [requireAuth] }, async (req, reply) => {
    const { includeInactive } = z.object({ includeInactive: z.coerce.boolean().default(false) }).parse(req.query)
    return reply.send(await repo.findAll(includeInactive))
  })

  app.post('/', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const body = z.object({ name: z.string().min(1), iban: z.string().optional() }).parse(req.body)
    return reply.status(201).send(await repo.create(body))
  })

  app.patch('/:id', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const body   = z.object({
      name:     z.string().optional(),
      iban:     z.string().nullable().optional(),
      isActive: z.boolean().optional(),
    }).parse(req.body)
    return reply.send(await repo.update(id, body))
  })
}
