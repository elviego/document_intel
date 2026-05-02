import { eq } from 'drizzle-orm'
import type { DB } from '../db/client.js'
import { users } from '../db/schema.js'
import type { IUserRepository, User, CreateUserInput, UpdateUserInput, UserId } from '../../domain/entities/User.js'

export class UserRepository implements IUserRepository {
  constructor(private readonly db: DB) {}

  async findById(id: UserId): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1)
    return rows[0] ? this.#map(rows[0]) : null
  }

  async findByEmail(email: string): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.email, email)).limit(1)
    return rows[0] ? this.#map(rows[0]) : null
  }

  async findByInviteToken(token: string): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.inviteToken, token)).limit(1)
    return rows[0] ? this.#map(rows[0]) : null
  }

  async findAll(): Promise<User[]> {
    const rows = await this.db.select().from(users)
    return rows.map(r => this.#map(r))
  }

  async create(input: CreateUserInput): Promise<User> {
    const rows = await this.db.insert(users).values({
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      inviteToken: input.inviteToken,
      inviteExpiresAt: input.inviteExpiresAt,
    }).returning()
    return this.#map(rows[0])
  }

  async update(id: UserId, input: Partial<UpdateUserInput>): Promise<User> {
    const rows = await this.db.update(users).set(input).where(eq(users.id, id)).returning()
    return this.#map(rows[0])
  }

  async delete(id: UserId): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id))
  }

  #map(row: typeof users.$inferSelect): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      fullName: row.fullName,
      role: row.role,
      inviteToken: row.inviteToken,
      inviteExpiresAt: row.inviteExpiresAt ? new Date(row.inviteExpiresAt) : null,
      isActive: row.isActive,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }
  }
}
