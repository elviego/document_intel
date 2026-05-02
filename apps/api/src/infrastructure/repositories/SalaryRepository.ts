import { eq, and } from 'drizzle-orm'
import type { DB } from '../db/client.js'
import { salaryEntries } from '../db/schema.js'
import type { SalaryEntry } from '../../domain/entities/SalaryEntry.js'

export interface ISalaryRepository {
  findByYear(schoolYearId: string): Promise<SalaryEntry[]>
  findByMonth(schoolYearId: string, month: number): Promise<SalaryEntry[]>
  create(input: Omit<SalaryEntry, 'id' | 'createdAt'>): Promise<SalaryEntry>
  update(id: string, input: Partial<Omit<SalaryEntry, 'id' | 'createdAt'>>): Promise<SalaryEntry>
  delete(id: string): Promise<void>
  linkTransaction(id: string, transactionId: string): Promise<void>
}

export class SalaryRepository implements ISalaryRepository {
  constructor(private readonly db: DB) {}

  async findByYear(schoolYearId: string): Promise<SalaryEntry[]> {
    const rows = await this.db.select().from(salaryEntries)
      .where(eq(salaryEntries.schoolYearId, schoolYearId))
      .orderBy(salaryEntries.month, salaryEntries.personName)
    return rows.map(this.#map)
  }

  async findByMonth(schoolYearId: string, month: number): Promise<SalaryEntry[]> {
    const rows = await this.db.select().from(salaryEntries)
      .where(and(eq(salaryEntries.schoolYearId, schoolYearId), eq(salaryEntries.month, month)))
    return rows.map(this.#map)
  }

  async create(input: Omit<SalaryEntry, 'id' | 'createdAt'>): Promise<SalaryEntry> {
    const rows = await this.db.insert(salaryEntries).values({
      schoolYearId:        input.schoolYearId,
      personName:          input.personName,
      salaryType:          input.salaryType,
      serviceName:         input.serviceName,
      baseAmount:          String(input.baseAmount),
      month:               input.month,
      actualAmount:        String(input.actualAmount),
      linkedTransactionId: input.linkedTransactionId,
    }).returning()
    return this.#map(rows[0])
  }

  async update(id: string, input: Partial<Omit<SalaryEntry, 'id' | 'createdAt'>>): Promise<SalaryEntry> {
    const patch: Record<string, unknown> = { ...input }
    if (input.baseAmount   !== undefined) patch.baseAmount   = String(input.baseAmount)
    if (input.actualAmount !== undefined) patch.actualAmount = String(input.actualAmount)
    const rows = await this.db.update(salaryEntries).set(patch).where(eq(salaryEntries.id, id)).returning()
    return this.#map(rows[0])
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(salaryEntries).where(eq(salaryEntries.id, id))
  }

  async linkTransaction(id: string, transactionId: string): Promise<void> {
    await this.db.update(salaryEntries)
      .set({ linkedTransactionId: transactionId })
      .where(eq(salaryEntries.id, id))
  }

  #map = (r: typeof salaryEntries.$inferSelect): SalaryEntry => ({
    id:                  r.id,
    schoolYearId:        r.schoolYearId,
    personName:          r.personName,
    salaryType:          r.salaryType,
    serviceName:         r.serviceName,
    baseAmount:          Number(r.baseAmount),
    month:               r.month,
    actualAmount:        Number(r.actualAmount),
    linkedTransactionId: r.linkedTransactionId,
    createdAt:           new Date(r.createdAt),
  })
}
