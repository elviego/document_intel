import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/client.js'
import { StudentRepository } from '../../repositories/StudentRepository.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const repo = new StudentRepository(db)

const studentBody = z.object({
  fullName:         z.string().min(1),
  schoolYearId:     z.string().uuid(),
  tuitionType:      z.string().default(''),
  firstName:        z.string().optional(),
  lastName:         z.string().optional(),
  birthDate:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  nationality:      z.string().optional(),
  nif:              z.string().optional(),
  address:          z.string().optional(),
  bloodType:        z.string().optional(),
  allergies:        z.string().optional(),
  medicalNotes:     z.string().optional(),
  photoConsent:     z.boolean().optional(),
  enrollmentDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  planId:           z.string().uuid().optional(),
  parent1FirstName: z.string().optional(),
  parent1LastName:  z.string().optional(),
  parent1Phone:     z.string().optional(),
  parent1Email:     z.string().email().optional().or(z.literal('')),
  parent1Relation:  z.string().optional(),
  parent2FirstName: z.string().optional(),
  parent2LastName:  z.string().optional(),
  parent2Phone:     z.string().optional(),
  parent2Email:     z.string().email().optional().or(z.literal('')),
  parent2Relation:  z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone:   z.string().optional(),
  notes:            z.string().optional(),
})

export const studentRoutes: FastifyPluginAsync = async (app) => {

  app.get('/:schoolYearId', { preHandler: [requireAuth] }, async (req, reply) => {
    const { schoolYearId } = z.object({ schoolYearId: z.string().uuid() }).parse(req.params)
    const { includeInactive } = z.object({ includeInactive: z.coerce.boolean().default(false) }).parse(req.query)
    return reply.send(await repo.findByYear(schoolYearId, includeInactive))
  })

  app.get('/detail/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const student = await repo.findById(id)
    if (!student) return reply.status(404).send({ error: 'Student not found' })
    return reply.send(student)
  })

  app.post('/', { preHandler: [requireRole('admin', 'staff')] }, async (req, reply) => {
    return reply.status(201).send(await repo.create(studentBody.parse(req.body)))
  })

  app.put('/:id', { preHandler: [requireRole('admin', 'staff')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const body   = studentBody.omit({ schoolYearId: true }).partial().parse(req.body)
    return reply.send(await repo.update(id, body))
  })

  app.delete('/:id', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    await repo.delete(id)
    return reply.status(204).send()
  })
}
