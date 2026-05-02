import type { FastifyRequest, FastifyReply } from 'fastify'
import { UnauthorizedError, ForbiddenError } from '../../../shared/errors.js'

export type Role = 'admin' | 'staff' | 'accountant'

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify()
  } catch {
    throw new UnauthorizedError()
  }
}

export function requireRole(...roles: Role[]) {
  return async (req: FastifyRequest, _reply: FastifyReply) => {
    await requireAuth(req, _reply)
    const payload = req.user as { role?: Role }
    if (!payload.role || !roles.includes(payload.role)) {
      throw new ForbiddenError()
    }
  }
}
