import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/client.js'
import { ActivityRepository } from '../../repositories/ActivityRepository.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const repo = new ActivityRepository(db)

const activityBody = z.object({
  schoolYearId: z.string().uuid(),
  name:         z.string().min(1),
  description:  z.string().optional(),
  schedule:     z.string().optional(),
  capacity:     z.number().int().positive().optional(),
})

export const activityRoutes: FastifyPluginAsync = async (app) => {

  app.get('/:schoolYearId', { preHandler: [requireAuth] }, async (req, reply) => {
    const { schoolYearId } = z.object({ schoolYearId: z.string().uuid() }).parse(req.params)
    return reply.send(await repo.findByYear(schoolYearId))
  })

  app.post('/', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    return reply.status(201).send(await repo.create(activityBody.parse(req.body)))
  })

  app.put('/:id', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const body   = activityBody.omit({ schoolYearId: true }).partial()
      .extend({ isActive: z.boolean().optional() }).parse(req.body)
    return reply.send(await repo.update(id, body))
  })

  app.delete('/:id', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    await repo.delete(id)
    return reply.status(204).send()
  })

  app.post('/:id/students', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const { id }       = z.object({ id: z.string().uuid() }).parse(req.params)
    const { studentId } = z.object({ studentId: z.string().uuid() }).parse(req.body)
    await repo.enrolStudent(id, studentId)
    return reply.status(204).send()
  })

  app.delete('/:id/students/:studentId', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const { id, studentId } = z.object({ id: z.string().uuid(), studentId: z.string().uuid() }).parse(req.params)
    await repo.unenrolStudent(id, studentId)
    return reply.status(204).send()
  })
}
