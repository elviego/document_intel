import { buildApp } from './infrastructure/http/app.js'
import { env } from './shared/env.js'

const server = await buildApp()

try {
  await server.listen({ port: env.PORT, host: '0.0.0.0' })
  server.log.info({ port: env.PORT }, 'API listening')
} catch (err) {
  server.log.error(err, 'Failed to start server')
  process.exit(1)
}
