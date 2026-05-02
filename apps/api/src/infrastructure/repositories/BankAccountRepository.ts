import { eq } from 'drizzle-orm'
import type { DB } from '../db/client.js'
import { bankAccounts } from '../db/schema.js'

export interface BankAccount { id: string; name: string; isActive: boolean }

export interface IBankAccountRepository {
  findAll(includeInactive?: boolean): Promise<BankAccount[]>
  findById(id: string): Promise<BankAccount | null>
  findByName(name: string): Promise<BankAccount | null>
  create(name: string): Promise<BankAccount>
  update(id: string, input: Partial<{ name: string; isActive: boolean }>): Promise<BankAccount>
}

export class BankAccountRepository implements IBankAccountRepository {
  constructor(private readonly db: DB) {}

  async findAll(includeInactive = false): Promise<BankAccount[]> {
    const rows = includeInactive
      ? await this.db.select().from(bankAccounts)
      : await this.db.select().from(bankAccounts).where(eq(bankAccounts.isActive, true))
    return rows.map(this.#map)
  }

  async findById(id: string): Promise<BankAccount | null> {
    const rows = await this.db.select().from(bankAccounts).where(eq(bankAccounts.id, id)).limit(1)
    return rows[0] ? this.#map(rows[0]) : null
  }

  async findByName(name: string): Promise<BankAccount | null> {
    // case-insensitive match to handle "AB vanda" vs "AB VANDA"
    const all = await this.db.select().from(bankAccounts)
    const match = all.find(r => r.name.toLowerCase() === name.toLowerCase())
    return match ? this.#map(match) : null
  }

  async create(name: string): Promise<BankAccount> {
    const rows = await this.db.insert(bankAccounts).values({ name }).returning()
    return this.#map(rows[0])
  }

  async update(id: string, input: Partial<{ name: string; isActive: boolean }>): Promise<BankAccount> {
    const rows = await this.db.update(bankAccounts).set(input).where(eq(bankAccounts.id, id)).returning()
    return this.#map(rows[0])
  }

  #map = (row: typeof bankAccounts.$inferSelect): BankAccount => ({
    id:       row.id,
    name:     row.name,
    isActive: row.isActive,
  })
}
