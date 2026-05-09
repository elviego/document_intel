export type SalaryType = 'contrato' | 'rec_verdes' | 'horas' | 'terceiros'

export interface SalaryEntry {
  id: string
  schoolYearId: string
  personName: string
  salaryType: SalaryType
  serviceName: string | null
  baseAmount: number
  month: number | null
  recurrence: string
  actualAmount: number
  linkedTransactionId: string | null
  createdAt: Date
}

export interface BudgetEntry {
  id: string
  schoolYearId: string
  categoryId: string
  month: number     // 1–12
  plannedAmount: number
}
