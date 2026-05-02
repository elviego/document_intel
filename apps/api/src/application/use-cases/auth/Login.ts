import bcrypt from 'bcryptjs'
import type { IUserRepository } from '../../../domain/entities/User.js'
import { AppError, UnauthorizedError } from '../../../shared/errors.js'

interface LoginInput {
  email: string
  password: string
}

interface LoginResult {
  userId: string
  email: string
  fullName: string
  role: string
}

export class Login {
  constructor(private readonly users: IUserRepository) {}

  async execute(input: LoginInput): Promise<LoginResult> {
    const user = await this.users.findByEmail(input.email.toLowerCase().trim())

    if (!user || !user.isActive || !user.passwordHash) {
      throw new UnauthorizedError()
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash)
    if (!valid) throw new UnauthorizedError()

    return { userId: user.id, email: user.email, fullName: user.fullName, role: user.role }
  }
}
