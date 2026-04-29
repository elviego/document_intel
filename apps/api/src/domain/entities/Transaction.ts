export type TransactionId = string

export interface Transaction {
  id: TransactionId
  schoolYearId: string
  categoryId: string
  bankAccountId: string
  date: Date
  monthLabel: string       // e.g. "set.25"
  amount: number           // positive = income, negative = expense
  description: string
  createdBy: string        // profile id
  createdAt: Date
  // populated via join
  categoryName?: string
  bankAccountName?: string
}

export interface CreateTransactionInput {
  schoolYearId: string
  categoryId: string
  bankAccountId: string
  date: Date
  amount: number
  description: string
  createdBy: string
}
