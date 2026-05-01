import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/client'
import { UserRepository } from '../../repositories/UserRepository'
import { requireRole } from '../middleware/auth'

const repo = new UserRepository(db)

export const userRoutes: FastifyPluginAsync = async (app) => {

  app.get('/', { preHandler: [requireRole('admin')] }, async (_req, reply) => {
    const users = await repo.findAll()
    return reply.send(users.map(u => ({
      id: u.id, email: u.email, fullName: u.fullName,
      role: u.role, isActive: u.isActive, createdAt: u.createdAt,
    })))
  })

  app.patch('/:id', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const body   = z.object({
      role:     z.enum(['admin', 'staff', 'accountant']).optional(),
      isActive: z.boolean().optional(),
      fullName: z.string().optional(),
    }).parse(req.body)
    const user = await repo.update(id, body)
    return reply.send({ id: user.id, email: user.email, fullName: user.fullName, role: user.role, isActive: user.isActive })
  })
}
