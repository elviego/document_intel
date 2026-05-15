import { eq, sql } from 'drizzle-orm'
import type { DB } from '../db/client.js'
import { budgetEntries, transactions } from '../db/schema.js'
import type { BudgetEntry } from '../../domain/entities/SalaryEntry.js'
import type { BudgetExecutionDTO } from '@document-intel/shared-types'

export interface IBudgetRepository {
  findByYear(schoolYearId: string): Promise<BudgetEntry[]>
  upsert(input: Omit<BudgetEntry, 'id'>): Promise<BudgetEntry>
  bulkUpsert(inputs: Omit<BudgetEntry, 'id'>[]): Promise<BudgetEntry[]>
  delete(id: string): Promise<void>
  getExecution(schoolYearId: string): Promise<BudgetExecutionDTO[]>
}

export class BudgetRepository implements IBudgetRepository {
  constructor(private readonly db: DB) {}

  async findByYear(schoolYearId: string): Promise<BudgetEntry[]> {
    const rows = await this.db.select().from(budgetEntries)
      .where(eq(budgetEntries.schoolYearId, schoolYearId))
    return rows.map(this.#map)
  }

  async getExecution(schoolYearId: string): Promise<BudgetExecutionDTO[]> {
    const planned = await this.db.select().from(budgetEntries)
      .where(eq(budgetEntries.schoolYearId, schoolYearId))

    const actuals = await this.db
      .select({
        categoryId:   transactions.categoryId,
        month:        sql<number>`extract(month from ${transactions.date}::date)::int`,
        actualAmount: sql<number>`sum(${transactions.amount})`,
      })
      .from(transactions)
      .where(eq(transactions.schoolYearId, schoolYearId))
      .groupBy(transactions.categoryId, sql`extract(month from ${transactions.date}::date)`)

    const plannedMap: Record<string, number> = {}
    const actualMap: Record<string, number>  = {}
    const keys = new Set<string>()

    for (const p of planned) {
      const k = `${p.categoryId}|${p.month}`
      plannedMap[k] = Number(p.plannedAmount)
      keys.add(k)
    }
    for (const a of actuals) {
      const k = `${a.categoryId}|${a.month}`
      actualMap[k] = Number(a.actualAmount)
      keys.add(k)
    }

    return Array.from(keys).map(k => {
      const [categoryId, monthStr] = k.split('|')
      return {
        categoryId,
        month:         Number(monthStr),
        plannedAmount: plannedMap[k] ?? 0,
        actualAmount:  actualMap[k]  ?? 0,
      }
    })
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
