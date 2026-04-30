import crypto from 'node:crypto'
import type { IUserRepository, UserRole } from '../../../domain/entities/User'
import type { IEmailService } from '../../../infrastructure/email/IEmailService'
import { AppError } from '../../../shared/errors'

interface InviteUserInput {
  email: string
  fullName: string
  role: UserRole
  invitedByName: string
  appUrl: string
}

export class InviteUser {
  constructor(
    private readonly users: IUserRepository,
    private readonly email: IEmailService,
  ) {}

  async execute(input: InviteUserInput): Promise<void> {
    const existing = await this.users.findByEmail(input.email.toLowerCase().trim())
    if (existing) throw new AppError('A user with this email already exists', 409)

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 72) // 72 h

    await this.users.create({
      email: input.email.toLowerCase().trim(),
      fullName: input.fullName,
      role: input.role,
      inviteToken: token,
      inviteExpiresAt: expiresAt,
    })

    await this.email.sendInvite({
      to: input.email,
      fullName: input.fullName,
      invitedByName: input.invitedByName,
      acceptUrl: `${input.appUrl}/auth/accept-invite?token=${token}`,
    })
  }
}
