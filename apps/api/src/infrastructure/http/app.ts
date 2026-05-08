import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import { ZodError } from 'zod'
import { env } from '../../shared/env.js'
import { AppError } from '../../shared/errors.js'
import { transactionRoutes } from './routes/transactions.js'
import { categoryRoutes } from './routes/categories.js'
import { mealRoutes } from './routes/meals.js'
import { budgetRoutes } from './routes/budget.js'
import { salaryRoutes } from './routes/salaries.js'
import { schoolYearRoutes } from './routes/school-years.js'
import { userRoutes } from './routes/users.js'
import { bankAccountRoutes } from './routes/bank-accounts.js'
import { authRoutes } from './routes/auth.js'
import { employeeRoutes } from './routes/employees.js'
import { activityRoutes } from './routes/activities.js'
import { enrollmentPlanRoutes } from './routes/enrollment-plans.js'
import { studentRoutes } from './routes/students.js'
import { wageRoutes } from './routes/wages.js'
import { ocrDocumentRoutes } from './routes/ocr-documents.js'
import { ocrConfigRoutes } from './routes/ocr-config.js'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: 'info',
      serializers: {
        req: (req) => ({ method: req.method, url: req.url, ip: req.ip }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    },
    disableRequestLogging: false,
    genReqId: () => Math.random().toString(36).slice(2, 9),
  })

  app.log.info({ corsOrigins: env.CORS_ORIGIN }, 'CORS config')
  await app.register(cors, {
    credentials: true,
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (env.CORS_ORIGIN.includes(origin)) return cb(null, origin)  // echo back the exact origin
      app.log.warn({ origin, allowed: env.CORS_ORIGIN }, 'CORS rejected')
      cb(new Error(`Origin not allowed: ${origin}`), false)
    },
  })
  await app.register(jwt, { secret: env.JWT_SECRET })
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } })
  await app.register(rateLimit, { max: 200, timeWindow: '1 minute' })

  // Global error handler
  app.setErrorHandler((error, req, reply) => {
    const reqId = req.id

    if (error instanceof AppError) {
      req.log.warn({ reqId, code: error.code, status: error.statusCode }, error.message)
      return reply.status(error.statusCode).send({ error: error.message, code: error.code, reqId })
    }

    if (error instanceof ZodError) {
      const fields = error.errors.map(e => `${e.path.join('.') || 'body'}: ${e.message}`)
      const msg = fields.join('; ')
      req.log.warn({ reqId, fields, code: 'VALIDATION_ERROR' }, 'Validation failed')
      return reply.status(400).send({ error: msg, code: 'VALIDATION_ERROR', reqId })
    }

    // PostgreSQL constraint errors
    const pgCode = (error as any).code
    if (pgCode === '23505') {
      req.log.warn({ reqId, pgCode, detail: (error as any).detail }, 'Unique constraint violation')
      return reply.status(409).send({ error: 'A record with those values already exists', code: 'DUPLICATE', reqId })
    }
    if (pgCode === '23503') {
      req.log.warn({ reqId, pgCode, detail: (error as any).detail }, 'Foreign key violation')
      return reply.status(409).send({ error: 'Referenced record does not exist', code: 'FK_VIOLATION', reqId })
    }
    if (pgCode === '23502') {
      req.log.warn({ reqId, pgCode, detail: (error as any).detail }, 'Not null violation')
      return reply.status(400).send({ error: 'A required field is missing', code: 'NULL_VIOLATION', reqId })
    }

    // Fastify rate limit
    const anyErr = error as any
    if (anyErr.statusCode === 429) {
      return reply.status(429).send({ error: 'Too many requests — please slow down', code: 'RATE_LIMITED', reqId })
    }

    req.log.error({
      reqId,
      err: { message: anyErr.message, stack: anyErr.stack, name: anyErr.name },
      req: { method: req.method, url: req.url, userId: (req.user as any)?.sub },
    }, 'Unhandled error')

    return reply.status(500).send({
      error: 'Internal server error',
      code: 'INTERNAL',
      reqId,
    })
  })

  // silence healthcheck polling from Railway
  app.get('/health', { logLevel: 'silent' }, async () => ({ status: 'ok', ts: new Date().toISOString() }))

  // Route groups — all under /v1
  await app.register(transactionRoutes,  { prefix: '/v1/transactions' })
  await app.register(categoryRoutes,     { prefix: '/v1/categories' })
  await app.register(mealRoutes,         { prefix: '/v1/meals' })
  await app.register(budgetRoutes,       { prefix: '/v1/budget' })
  await app.register(salaryRoutes,       { prefix: '/v1/salaries' })
  await app.register(schoolYearRoutes,   { prefix: '/v1/school-years' })
  await app.register(userRoutes,         { prefix: '/v1/users' })
  await app.register(bankAccountRoutes,  { prefix: '/v1/bank-accounts' })
  await app.register(authRoutes,         { prefix: '/v1/auth' })
  await app.register(employeeRoutes,      { prefix: '/v1/employees' })
  await app.register(activityRoutes,      { prefix: '/v1/activities' })
  await app.register(enrollmentPlanRoutes,{ prefix: '/v1/enrollment-plans' })
  await app.register(studentRoutes,       { prefix: '/v1/students' })
  await app.register(wageRoutes,          { prefix: '/v1/wages' })
  await app.register(ocrDocumentRoutes,   { prefix: '/v1/ocr/documents' })
  await app.register(ocrConfigRoutes,     { prefix: '/v1/ocr' })

  return app
}
