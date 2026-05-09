import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/client.js'
import { MealRepository }     from '../../repositories/MealRepository.js'
import { MealBillingService } from '../../../domain/services/MealBillingService.js'
import { previewStudentCsv, ImportStudents } from '../../../application/use-cases/meals/ImportStudents.js'
import { ValidationError } from '../../../shared/errors.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const repo    = new MealRepository(db)
const billing = new MealBillingService()

const mealTypeBody = z.object({
  name:         z.string().min(1),
  description:  z.string().optional(),
  mealsPerWeek: z.number().int().min(1).max(5).default(5),
  parentPrice:  z.number().min(0).default(0),
  schoolCost:   z.number().min(0).default(0),
})

export const mealRoutes: FastifyPluginAsync = async (app) => {

  app.get('/children/:schoolYearId', { preHandler: [requireAuth] }, async (req, reply) => {
    const { schoolYearId } = z.object({ schoolYearId: z.string().uuid() }).parse(req.params)
    return reply.send(await repo.findChildren(schoolYearId))
  })

  app.post('/children', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const body = z.object({
      fullName: z.string().min(1), schoolYearId: z.string().uuid(),
      tuitionType: z.string(), isActive: z.boolean().default(true),
    }).parse(req.body)
    return reply.status(201).send(await repo.createChild(body))
  })

  app.patch('/children/:id', { preHandler: [requireRole('admin', 'staff')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const body = z.object({
      fullName: z.string().optional(), tuitionType: z.string().optional(), isActive: z.boolean().optional(),
    }).parse(req.body)
    return reply.send(await repo.updateChild(id, body))
  })

  app.post('/children/import/preview', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const file = await req.file()
    if (!file) throw new ValidationError('No file uploaded')
    const buffer = await file.toBuffer()
    return reply.send(previewStudentCsv(buffer))
  })

  app.post('/children/import/confirm', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const body = z.object({
      schoolYearId: z.string().uuid(),
      rows: z.array(z.object({ fullName: z.string(), tuitionType: z.string() })),
    }).parse(req.body)
    const result = await new ImportStudents(repo).execute(body.rows, body.schoolYearId)
    return reply.send(result)
  })

  app.get('/records', { preHandler: [requireAuth] }, async (req, reply) => {
    const q = z.object({
      childId: z.string().uuid().optional(),
      from:    z.string().optional(),
      to:      z.string().optional(),
    }).parse(req.query)
    return reply.send(await repo.findRecords(
      q.childId,
      q.from ? new Date(q.from) : undefined,
      q.to   ? new Date(q.to)   : undefined,
    ))
  })

  app.post('/records', { preHandler: [requireRole('admin', 'staff')] }, async (req, reply) => {
    const user = req.user as { sub: string }
    const body = z.object({
      childId:  z.string().uuid(),
      date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      mealType: z.enum(['com_sopa', 'sem_sopa']),
    }).parse(req.body)
    return reply.status(201).send(await repo.createRecord({
      childId: body.childId, date: new Date(body.date),
      mealType: body.mealType, billed: false, createdBy: user.sub,
    }))
  })

  app.delete('/records/:id', { preHandler: [requireRole('admin', 'staff')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    await repo.deleteRecord(id)
    return reply.status(204).send()
  })

  app.get('/pricing/:schoolYearId', { preHandler: [requireAuth] }, async (req, reply) => {
    const { schoolYearId } = z.object({ schoolYearId: z.string().uuid() }).parse(req.params)
    return reply.send(await repo.findPricing(schoolYearId))
  })

  app.put('/pricing', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const body = z.object({
      schoolYearId: z.string().uuid(),
      mealType:     z.enum(['com_sopa', 'sem_sopa']),
      schoolCost:   z.number().positive(),
      parentPrice:  z.number().positive(),
    }).parse(req.body)
    return reply.send(await repo.upsertPricing(body))
  })

  app.get('/billing/:schoolYearId/:year/:month', { preHandler: [requireAuth] }, async (req, reply) => {
    const { schoolYearId, year, month } = z.object({
      schoolYearId: z.string().uuid(),
      year:  z.coerce.number().int(),
      month: z.coerce.number().int().min(1).max(12),
    }).parse(req.params)
    const [childList, pricing, records] = await Promise.all([
      repo.findChildren(schoolYearId),
      repo.findPricing(schoolYearId),
      repo.findRecords(undefined, new Date(year, month - 1, 1), new Date(year, month, 0)),
    ])
    return reply.send(billing.calculate(records, pricing, childList, month, year))
  })

  // ── Meal Types ────────────────────────────────────────────────────────────────────────────
  app.get('/meal-types', { preHandler: [requireAuth] }, async (_req, reply) => {
    return reply.send(await repo.findMealTypes())
  })

  app.post('/meal-types', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    return reply.status(201).send(await repo.createMealType(mealTypeBody.parse(req.body)))
  })

  app.put('/meal-types/:id', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const body   = mealTypeBody.partial().extend({ isActive: z.boolean().optional() }).parse(req.body)
    return reply.send(await repo.updateMealType(id, body))
  })

  app.delete('/meal-types/:id', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    await repo.deleteMealType(id)
    return reply.status(204).send()
  })

  // ── Child Meal Plans ────────────────────────────────────────────────────────────────────────────
  app.get('/child-meal-plans/:childId', { preHandler: [requireAuth] }, async (req, reply) => {
    const { childId } = z.object({ childId: z.string().uuid() }).parse(req.params)
    return reply.send(await repo.findChildMealPlans(childId))
  })

  app.post('/child-meal-plans', { preHandler: [requireRole('admin', 'staff')] }, async (req, reply) => {
    const body = z.object({
      childId:     z.string().uuid(),
      mealTypeId:  z.string().uuid(),
      startDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }).parse(req.body)
    return reply.status(201).send(await repo.assignMealPlan(body))
  })

  app.put('/child-meal-plans/:id', { preHandler: [requireRole('admin', 'staff')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const body   = z.object({ endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable() }).parse(req.body)
    return reply.send(await repo.updateMealPlanEnd(id, body.endDate))
  })

  // ── Records with meal_type_id ────────────────────────────────────────────────────────────────────────────
  app.post('/records/v2', { preHandler: [requireRole('admin', 'staff')] }, async (req, reply) => {
    const user = req.user as { sub: string }
    const body = z.object({
      childId:    z.string().uuid(),
      date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      mealTypeId: z.string().uuid(),
    }).parse(req.body)
    return reply.status(201).send(await repo.createRecordV2({
      childId: body.childId, date: new Date(body.date),
      mealTypeId: body.mealTypeId, createdBy: user.sub,
    }))
  })

  app.post('/records/populate-month', { preHandler: [requireRole('admin', 'staff')] }, async (req, reply) => {
    const user = req.user as { sub: string }
    const body = z.object({
      schoolYearId: z.string().uuid(),
      year:  z.number().int(),
      month: z.number().int().min(1).max(12),
    }).parse(req.body)
    const count = await repo.populateMonth(body.schoolYearId, body.year, body.month, user.sub)
    return reply.send({ count })
  })
}
