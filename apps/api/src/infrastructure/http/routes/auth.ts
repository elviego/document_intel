import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/client.js'
import { UserRepository } from '../../repositories/UserRepository.js'
import { ResendEmailService } from '../../email/ResendEmailService.js'
import { Login } from '../../../application/use-cases/auth/Login.js'
import { InviteUser } from '../../../application/use-cases/auth/InviteUser.js'
import { AcceptInvite } from '../../../application/use-cases/auth/AcceptInvite.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { env } from '../../../shared/env.js'

export const authRoutes: FastifyPluginAsync = async (app) => {
  const userRepo  = new UserRepository(db)
  const emailSvc  = new ResendEmailService()

  // POST /v1/auth/login
  app.post('/login', async (req, reply) => {
    const body = z.object({ email: z.string().email(), password: z.string() }).parse(req.body)
    app.log.info({ email: body.email }, '[login] attempt')
    try {
      const result = await new Login(userRepo).execute(body)
      const token = app.jwt.sign(
        { sub: result.userId, email: result.email, role: result.role },
        { expiresIn: '8h' },
      )
      app.log.info({ email: body.email }, '[login] success')
      return reply.send({ token, user: { id: result.userId, email: result.email, fullName: result.fullName, role: result.role } })
    } catch (err) {
      app.log.warn({ email: body.email, err }, '[login] failed')
      throw err
    }
  })

  // POST /v1/auth/invite  (admin only)
  app.post('/invite', { preHandler: [requireRole('admin')] }, async (req, reply) => {
    const body = z.object({
      email: z.string().email(),
      fullName: z.string().min(1),
      role: z.enum(['admin', 'staff', 'accountant']),
    }).parse(req.body)

    const caller = req.user as { fullName?: string; email: string }
    await new InviteUser(userRepo, emailSvc).execute({
      ...body,
      invitedByName: caller.fullName ?? caller.email,
      appUrl: env.APP_URL,
    })
    return reply.status(201).send({ message: 'Invite sent' })
  })

  // POST /v1/auth/accept-invite
  app.post('/accept-invite', async (req, reply) => {
    const body = z.object({
      token: z.string(),
      password: z.string().min(8),
      fullName: z.string().optional(),
    }).parse(req.body)
    await new AcceptInvite(userRepo).execute(body)
    return reply.status(200).send({ message: 'Account activated' })
  })

  // GET /v1/auth/me
  app.get('/me', { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as { sub: string; email: string; role: string }
    const user = await userRepo.findById(payload.sub)
    if (!user) return reply.status(404).send({ error: 'User not found' })
    return reply.send({ id: user.id, email: user.email, fullName: user.fullName, role: user.role })
  })
}
