import type { FastifyPluginAsync } from 'fastify'
import { requireAuth, requireRole } from '../middleware/auth'

// TODO: inject repository/use-case dependencies via plugin options or DI container
export const schoolUyearsRoutes: FastifyPluginAsync = async (app) => {
  // GET list
  app.get('/', { preHandler: [requireAuth] }, async (req, reply) => {
    return reply.send([])
  })
}
