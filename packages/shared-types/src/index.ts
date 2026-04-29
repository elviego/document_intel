// Shared DTOs — used by both web and api packages.
// Keep this framework-agnostic: no Zod, no Fastify, no React.

export type Role            = 'admin' | 'staff' | 'accountant'
export type Classification  = 'receita' | 'despesa'
export type SalaryType      = 'contrato' | 'rec_verdes' | 'horas' | 'terceiros'
export type MealType        = 'com_sopa' | 'sem_sopa'

// ─── Pagination ──────────────────────────────────────────────────────────────
export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// ─── Transaction ─────────────────────────────────────────────────────────────
export interface TransactionDTO {
  id: string
  schoolYearId: string
  categoryId: string
  categoryName: string
  bankAccountId: string
  bankAccountName: string
  date: string          // ISO date "2025-09-15"
  monthLabel: string    // "set.25"
  amount: number
  description: string
  createdBy: string
  createdAt: string
}

export interface CreateTransactionDTO {
  schoolYearId: string
  categoryId: string
  bankAccountId: string
  date: string
  amount: number
  description: string
}

// ─── Category ────────────────────────────────────────────────────────────────
export interface CategoryDTO {
  id: string
  namePt: string
  nameEn: string
  classification: Classification
  groupPt: string
  groupEn: string
  descriptionPt: string | null
  descriptionEn: string | null
  isActive: boolean
}

// ─── School Year ─────────────────────────────────────────────────────────────
export interface SchoolYearDTO {
  id: string
  name: string
  startDate: string
  endDate: string
}

// ─── Budget ──────────────────────────────────────────────────────────────────
export interface BudgetEntryDTO {
  id: string
  schoolYearId: string
  categoryId: string
  month: number
  plannedAmount: number
}

export interface MonthlySummaryRow {
  categoryId: string
  categoryName: string
  classification: Classification
  group: string
  months: Record<number, { actual: number; planned: number }>  // key = 1–12
  yearTotal: number
}

// ─── Meals ───────────────────────────────────────────────────────────────────
export interface ChildDTO {
  id: string
  fullName: string
  schoolYearId: string
  tuitionType: string
  isActive: boolean
}

export interface MealRecordDTO {
  id: string
  childId: string
  childName: string
  date: string
  mealType: MealType
  billed: boolean
}

export interface ChildMonthlyBillingDTO {
  childId: string
  childName: string
  month: number
  year: number
  withSoupCount: number
  withoutSoupCount: number
  schoolCost: number
  parentCharge: number
}

// ─── Salaries ────────────────────────────────────────────────────────────────
export interface SalaryEntryDTO {
  id: string
  schoolYearId: string
  personName: string
  salaryType: SalaryType
  serviceName: string | null
  baseAmount: number
  month: number
  actualAmount: number
  linkedTransactionId: string | null
}

// ─── API responses ───────────────────────────────────────────────────────────
export interface ApiError {
  error: string
  code?: string
}

export interface ImportResultDTO {
  imported: number
  skipped: number
  errors: string[]
}
