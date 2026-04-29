import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import { env } from '../../shared/env'
import { AppError } from '../../shared/errors'
import { transactionRoutes } from './routes/transactions'
import { categoryRoutes } from './routes/categories'
import { mealRoutes } from './routes/meals'
import { budgetRoutes } from './routes/budget'
import { salaryRoutes } from './routes/salaries'
import { schoolYearRoutes } from './routes/school-years'
import { userRoutes } from './routes/users'
import { bankAccountRoutes } from './routes/bank-accounts'

export async function buildApp() {
  const app = Fastify({ logger: env.NODE_ENV === 'development' })

  await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true })
  await app.register(jwt, { secret: env.JWT_SECRET })
  await app.register(rateLimit, { max: 200, timeWindow: '1 minute' })

  // Global error handler
  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ error: error.message, code: error.code })
    }
    app.log.error(error)
    return reply.status(500).send({ error: 'Internal server error' })
  })

  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

  // Route groups — all under /v1
  await app.register(transactionRoutes,  { prefix: '/v1/transactions' })
  await app.register(categoryRoutes,     { prefix: '/v1/categories' })
  await app.register(mealRoutes,         { prefix: '/v1/meals' })
  await app.register(budgetRoutes,       { prefix: '/v1/budget' })
  await app.register(salaryRoutes,       { prefix: '/v1/salaries' })
  await app.register(schoolYearRoutes,   { prefix: '/v1/school-years' })
  await app.register(userRoutes,         { prefix: '/v1/users' })
  await app.register(bankAccountRoutes,  { prefix: '/v1/bank-accounts' })

  return app
}
