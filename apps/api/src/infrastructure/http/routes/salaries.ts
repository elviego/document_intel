import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/client.js'
import { SalaryRepository }      from '../../repositories/SalaryRepository.js'
import { TransactionRepository } from '../../repositories/TransactionRepository.js'
import { CategoryRepository }    from '../../repositories/CategoryRepository.js'
import { BankAccountRepository } from '../../repositories/BankAccountRepository.js'
import { requireRole } from '../middleware/auth.js'

const salaryRepo = new SalaryRepository(db)
const txRepo     = new TransactionRepository(db)
const catRepo    = new CategoryRepository(db)
const bankRepo   = new BankAccountRepository(db)

const SALARY_CAT: Record<string, string> = {
  contrato:   'Ordenado - Contrato',
  rec_verdes: 'Ordenado - Rec. Verdes',
  horas:      'Pagamento de Horas',
  terceiros:  'Pagamento a Terceiros',
}

export const salaryRoutes: FastifyPluginAsync = async (app) => {

  app.get('/:schoolYearId', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const { schoolYearId } = z.object({ schoolYearId: z.string().uuid() }).parse(req.params)
    return reply.send(await salaryRepo.findByYear(schoolYearId))
  })

  app.post('/', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const user = req.user as { sub: string }
    const body = z.object({
      schoolYearId:  z.string().uuid(),
      personName:    z.string().min(1),
      salaryType:    z.enum(['contrato', 'rec_verdes', 'horas', 'terceiros']),
      serviceName:   z.string().nullable().default(null),
      baseAmount:    z.number(),
      month:         z.number().int().min(1).max(12),
      actualAmount:  z.number(),
      bankAccountId: z.string().uuid(),
    }).parse(req.body)

    const cat  = await catRepo.findByNamePt(SALARY_CAT[body.salaryType])
    const bank = await bankRepo.findById(body.bankAccountId)
    let linkedTransactionId: string | null = null

    if (cat && bank) {
      const d = new Date(); d.setMonth(body.month - 1); d.setDate(25)
      const tx = await txRepo.create({
        schoolYearId:  body.schoolYearId,
        categoryId:    cat.id,
        bankAccountId: bank.id,
        date:          d,
        amount:        -Math.abs(body.actualAmount),
        description:   `${body.personName}${body.serviceName ? ' — ' + body.serviceName : ''}`,
        createdBy:     user.sub,
      })
      linkedTransactionId = tx.id
    }

    return reply.status(201).send(await salaryRepo.create({ ...body, linkedTransactionId }))
  })

  app.patch('/:id', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const body = z.object({ actualAmount: z.number().optional(), baseAmount: z.number().optional() }).parse(req.body)
    return reply.send(await salaryRepo.update(id, body))
  })

  app.delete('/:id', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    await salaryRepo.delete(id)
    return reply.status(204).send()
  })
}
