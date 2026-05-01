import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/client'
import { TransactionRepository }  from '../../repositories/TransactionRepository'
import { CategoryRepository }     from '../../repositories/CategoryRepository'
import { BankAccountRepository }  from '../../repositories/BankAccountRepository'
import { ImportTransactions }     from '../../../application/use-cases/transactions/ImportTransactions'
import { ExportTransactions }     from '../../../application/use-cases/transactions/ExportTransactions'
import { requireAuth, requireRole } from '../middleware/auth'

const txRepo   = new TransactionRepository(db)
const catRepo  = new CategoryRepository(db)
const bankRepo = new BankAccountRepository(db)

export const transactionRoutes: FastifyPluginAsync = async (app) => {

  // GET /v1/transactions
  app.get('/', { preHandler: [requireAuth] }, async (req, reply) => {
    const q = z.object({
      schoolYearId:  z.string().optional(),
      categoryId:    z.string().optional(),
      bankAccountId: z.string().optional(),
      monthLabel:    z.string().optional(),
      from:          z.string().optional(),
      to:            z.string().optional(),
      search:        z.string().optional(),
    }).parse(req.query)
    const rows = await txRepo.findAll({
      ...q,
      from: q.from ? new Date(q.from) : undefined,
      to:   q.to   ? new Date(q.to)   : undefined,
    })
    return reply.send(rows)
  })

  // POST /v1/transactions
  app.post('/', { preHandler: [requireRole('admin', 'staff')] }, async (req, reply) => {
    const body = z.object({
      schoolYearId:  z.string().uuid(),
      categoryId:    z.string().uuid(),
      bankAccountId: z.string().uuid(),
      date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      amount:        z.number(),
      description:   z.string().default(''),
    }).parse(req.body)
    const user = req.user as { sub: string }
    const tx = await txRepo.create({ ...body, date: new Date(body.date), createdBy: user.sub })
    return reply.status(201).send(tx)
  })

  // DELETE /v1/transactions/:id
  app.delete('/:id', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    await txRepo.delete(id)
    return reply.status(204).send()
  })

  // GET /v1/transactions/summary/:schoolYearId
  app.get('/summary/:schoolYearId', { preHandler: [requireAuth] }, async (req, reply) => {
    const { schoolYearId } = z.object({ schoolYearId: z.string().uuid() }).parse(req.params)
    return reply.send(await txRepo.monthlySummary(schoolYearId))
  })

  // GET /v1/transactions/export
  app.get('/export', { preHandler: [requireRole('admin', 'accountant')] }, async (req, reply) => {
    const q = z.object({
      schoolYearId: z.string().uuid().optional(),
      monthLabel:   z.string().optional(),
    }).parse(req.query)
    const csv = await new ExportTransactions(txRepo).execute(q)
    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', 'attachment; filename="movimentos.csv"')
      .send(csv)
  })
}
