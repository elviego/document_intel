import { buildApp } from './infrastructure/http/app.js'
import { env } from './shared/env.js'
import { logger } from './shared/logger.js'

const server = await buildApp()

try {
  await server.listen({ port: env.PORT, host: '0.0.0.0' })
  logger.info(`API running on port ${env.PORT}`)
} catch (err) {
  logger.error(err)
  process.exit(1)
}
