import { eq, and, gte, lte, ilike, sql } from 'drizzle-orm'
import type { DB } from '../db/client'
import { transactions, categories, bankAccounts } from '../db/schema'
import type {
  ITransactionRepository, TransactionFilters, MonthlyCategorySummary,
} from '../../domain/repositories/ITransactionRepository'
import type { Transaction, CreateTransactionInput, TransactionId } from '../../domain/entities/Transaction'
import { monthLabel } from '../../domain/entities/SchoolYear'

export class TransactionRepository implements ITransactionRepository {
  constructor(private readonly db: DB) {}

  async findAll(filters: TransactionFilters = {}): Promise<Transaction[]> {
    const conditions = [
      filters.schoolYearId  ? eq(transactions.schoolYearId, filters.schoolYearId)   : undefined,
      filters.categoryId    ? eq(transactions.categoryId, filters.categoryId)         : undefined,
      filters.bankAccountId ? eq(transactions.bankAccountId, filters.bankAccountId)   : undefined,
      filters.monthLabel    ? eq(transactions.monthLabel, filters.monthLabel)          : undefined,
      filters.from          ? gte(transactions.date, filters.from.toISOString().slice(0,10)) : undefined,
      filters.to            ? lte(transactions.date, filters.to.toISOString().slice(0,10))   : undefined,
      filters.search        ? ilike(transactions.description, `%${filters.search}%`)  : undefined,
    ].filter(Boolean) as ReturnType<typeof eq>[]

    const rows = await this.db
      .select({
        t: transactions,
        categoryName:    categories.namePt,
        bankAccountName: bankAccounts.name,
      })
      .from(transactions)
      .leftJoin(categories,    eq(transactions.categoryId,    categories.id))
      .leftJoin(bankAccounts,  eq(transactions.bankAccountId, bankAccounts.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(sql`${transactions.date} desc`)

    return rows.map(r => this.#map(r.t, r.categoryName ?? '', r.bankAccountName ?? ''))
  }

  async findById(id: TransactionId): Promise<Transaction | null> {
    const rows = await this.db
      .select({ t: transactions, categoryName: categories.namePt, bankAccountName: bankAccounts.name })
      .from(transactions)
      .leftJoin(categories,   eq(transactions.categoryId,    categories.id))
      .leftJoin(bankAccounts, eq(transactions.bankAccountId, bankAccounts.id))
      .where(eq(transactions.id, id))
      .limit(1)
    return rows[0] ? this.#map(rows[0].t, rows[0].categoryName ?? '', rows[0].bankAccountName ?? '') : null
  }

  async create(input: CreateTransactionInput): Promise<Transaction> {
    const label = monthLabel(input.date)
    const rows = await this.db.insert(transactions).values({
      schoolYearId:  input.schoolYearId,
      categoryId:    input.categoryId,
      bankAccountId: input.bankAccountId,
      date:          input.date.toISOString().slice(0, 10),
      monthLabel:    label,
      amount:        String(input.amount),
      description:   input.description,
      createdBy:     input.createdBy,
    }).returning()
    return this.#map(rows[0], '', '')
  }

  async bulkCreate(inputs: CreateTransactionInput[]): Promise<Transaction[]> {
    return Promise.all(inputs.map(i => this.create(i)))
  }

  async delete(id: TransactionId): Promise<void> {
    await this.db.delete(transactions).where(eq(transactions.id, id))
  }

  async monthlySummary(schoolYearId: string): Promise<MonthlyCategorySummary[]> {
    const rows = await this.db
      .select({
        categoryId:     transactions.categoryId,
        categoryName:   categories.namePt,
        classification: categories.classification,
        month:          sql<number>`extract(month from ${transactions.date}::date)`,
        total:          sql<number>`sum(${transactions.amount})`,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(eq(transactions.schoolYearId, schoolYearId))
      .groupBy(transactions.categoryId, categories.namePt, categories.classification,
        sql`extract(month from ${transactions.date}::date)`)

    return rows.map(r => ({
      categoryId:     r.categoryId,
      categoryName:   r.categoryName ?? '',
      classification: r.classification ?? 'despesa',
      month:          Number(r.month),
      total:          Number(r.total),
    }))
  }

  #map(row: typeof transactions.$inferSelect, categoryName: string, bankAccountName: string): Transaction {
    return {
      id:              row.id,
      schoolYearId:    row.schoolYearId,
      categoryId:      row.categoryId,
      bankAccountId:   row.bankAccountId,
      date:            new Date(row.date),
      monthLabel:      row.monthLabel,
      amount:          Number(row.amount),
      description:     row.description,
      createdBy:       row.createdBy,
      createdAt:       new Date(row.createdAt),
      categoryName,
      bankAccountName,
    }
  }
}
