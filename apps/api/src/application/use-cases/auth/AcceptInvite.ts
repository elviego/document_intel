import bcrypt from 'bcryptjs'
import type { IUserRepository } from '../../../domain/entities/User.js'
import { AppError, NotFoundError } from '../../../shared/errors.js'

interface AcceptInviteInput {
  token: string
  password: string
  fullName?: string
}

export class AcceptInvite {
  constructor(private readonly users: IUserRepository) {}

  async execute(input: AcceptInviteInput): Promise<void> {
    const user = await this.users.findByInviteToken(input.token)
    if (!user) throw new NotFoundError('Invite')

    if (!user.inviteExpiresAt || user.inviteExpiresAt < new Date()) {
      throw new AppError('Invite link has expired', 410)
    }

    if (input.password.length < 8) {
      throw new AppError('Password must be at least 8 characters', 422)
    }

    const passwordHash = await bcrypt.hash(input.password, 12)

    await this.users.update(user.id, {
      passwordHash,
      fullName: input.fullName ?? user.fullName,
      inviteToken: null,
      inviteExpiresAt: null,
      isActive: true,
    })
  }
}
