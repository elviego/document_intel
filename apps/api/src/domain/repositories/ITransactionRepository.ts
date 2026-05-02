import type { Transaction, CreateTransactionInput, TransactionId } from '../entities/Transaction.js'

export interface TransactionFilters {
  schoolYearId?: string
  categoryId?: string
  bankAccountId?: string
  from?: Date
  to?: Date
  monthLabel?: string
  search?: string
}

export interface ITransactionRepository {
  findAll(filters: TransactionFilters): Promise<Transaction[]>
  findById(id: TransactionId): Promise<Transaction | null>
  create(input: CreateTransactionInput): Promise<Transaction>
  delete(id: TransactionId): Promise<void>
  bulkCreate(inputs: CreateTransactionInput[]): Promise<Transaction[]>
  monthlySummary(schoolYearId: string): Promise<MonthlyCategorySummary[]>
}

export interface MonthlyCategorySummary {
  categoryId: string
  categoryName: string
  classification: string
  month: number
  total: number
}
