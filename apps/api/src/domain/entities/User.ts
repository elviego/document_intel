export type UserId = string
export type UserRole = 'admin' | 'staff' | 'accountant'

export interface User {
  id: UserId
  email: string
  passwordHash: string | null
  fullName: string
  role: UserRole
  inviteToken: string | null
  inviteExpiresAt: Date | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IUserRepository {
  findById(id: UserId): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  findByInviteToken(token: string): Promise<User | null>
  findAll(): Promise<User[]>
  create(input: CreateUserInput): Promise<User>
  update(id: UserId, input: Partial<UpdateUserInput>): Promise<User>
  delete(id: UserId): Promise<void>
}

export interface CreateUserInput {
  email: string
  fullName: string
  role: UserRole
  inviteToken: string
  inviteExpiresAt: Date
}

export interface UpdateUserInput {
  email: string
  fullName: string
  role: UserRole
  passwordHash: string | null
  inviteToken: string | null
  inviteExpiresAt: Date | null
  isActive: boolean
}
