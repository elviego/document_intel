import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/client'
import { SchoolYearRepository } from '../../repositories/SchoolYearRepository'
import { requireAuth, requireRole } from '../middleware/auth'

const repo = new SchoolYearRepository(db)

export const schoolYearRoutes: FastifyPluginAsync = async (app) => {

  app.get('/', { preHandler: [requireAuth] }, async (_req, reply) => {
    return reply.send(await repo.findAll())
  })

  app.post('/', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const body = z.object({
      name:      z.string().regex(/^\d{4}-\d{2}$/),
      startDate: z.string(),
      endDate:   z.string(),
    }).parse(req.body)
    return reply.status(201).send(await repo.create({
      name:      body.name,
      startDate: new Date(body.startDate),
      endDate:   new Date(body.endDate),
    }))
  })
}
