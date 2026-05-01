import { eq, and } from 'drizzle-orm'
import type { DB } from '../db/client'
import { budgetEntries } from '../db/schema'
import type { BudgetEntry } from '../../domain/entities/SalaryEntry'

export interface IBudgetRepository {
  findByYear(schoolYearId: string): Promise<BudgetEntry[]>
  upsert(input: Omit<BudgetEntry, 'id'>): Promise<BudgetEntry>
  bulkUpsert(inputs: Omit<BudgetEntry, 'id'>[]): Promise<BudgetEntry[]>
  delete(id: string): Promise<void>
}

export class BudgetRepository implements IBudgetRepository {
  constructor(private readonly db: DB) {}

  async findByYear(schoolYearId: string): Promise<BudgetEntry[]> {
    const rows = await this.db.select().from(budgetEntries)
      .where(eq(budgetEntries.schoolYearId, schoolYearId))
    return rows.map(this.#map)
  }

  async upsert(input: Omit<BudgetEntry, 'id'>): Promise<BudgetEntry> {
    const rows = await this.db.insert(budgetEntries)
      .values({
        schoolYearId:  input.schoolYearId,
        categoryId:    input.categoryId,
        month:         input.month,
        plannedAmount: String(input.plannedAmount),
      })
      .onConflictDoUpdate({
        target: [budgetEntries.schoolYearId, budgetEntries.categoryId, budgetEntries.month],
        set:    { plannedAmount: String(input.plannedAmount) },
      })
      .returning()
    return this.#map(rows[0])
  }

  async bulkUpsert(inputs: Omit<BudgetEntry, 'id'>[]): Promise<BudgetEntry[]> {
    return Promise.all(inputs.map(i => this.upsert(i)))
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(budgetEntries).where(eq(budgetEntries.id, id))
  }

  #map = (row: typeof budgetEntries.$inferSelect): BudgetEntry => ({
    id:            row.id,
    schoolYearId:  row.schoolYearId,
    categoryId:    row.categoryId,
    month:         row.month,
    plannedAmount: Number(row.plannedAmount),
  })
}
