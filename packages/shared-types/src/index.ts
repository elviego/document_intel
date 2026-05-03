// Shared DTOs — used by both web and api packages.
// Keep this framework-agnostic: no Zod, no Fastify, no React.

export type Role            = 'admin' | 'staff' | 'accountant'
export type Classification  = 'receita' | 'despesa'
export type SalaryType      = 'contrato' | 'rec_verdes' | 'horas' | 'terceiros'
export type MealType        = 'com_sopa' | 'sem_sopa'

// ─── Bank Account ─────────────────────────────────────────────────────────────
export interface BankAccount {
  id: string
  name: string
  isActive: boolean
}

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

export interface BudgetExecutionDTO {
  categoryId: string
  month: number
  plannedAmount: number
  actualAmount: number
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

// ─── Employee ────────────────────────────────────────────────────────────────
export interface EmployeeDTO {
  id: string
  fullName: string
  position: string
  contractType: string
  email: string | null
  phone: string | null
  nif: string | null
  iban: string | null
  baseSalary: number
  startDate: string | null
  endDate: string | null
  isActive: boolean
  notes: string | null
}

export interface CreateEmployeeDTO {
  fullName: string
  position: string
  contractType: string
  email?: string
  phone?: string
  nif?: string
  iban?: string
  baseSalary: number
  startDate?: string
  endDate?: string
  notes?: string
}

// ─── Activities ───────────────────────────────────────────────────────────────
export interface ActivityDTO {
  id: string
  schoolYearId: string
  name: string
  description: string | null
  schedule: string | null
  capacity: number | null
  isActive: boolean
  students: { id: string; fullName: string }[]
}

export interface CreateActivityDTO {
  schoolYearId: string
  name: string
  description?: string
  schedule?: string
  capacity?: number
}

// ─── Import ──────────────────────────────────────────────────────────────────
export interface ImportRowDTO {
  rowIndex: number
  date: string           // YYYY-MM-DD
  categoryName: string
  bankAccountName: string
  amount: number
  description: string
}

export interface ImportPreviewDTO {
  rows: ImportRowDTO[]
  unknownCategories: string[]   // category names not found in DB
  unknownAccounts: string[]     // account names not found in DB
  parseErrors: string[]         // rows that could not be parsed
}

export interface NewCategoryInput {
  namePt: string
  nameEn: string
  classification: Classification
  groupPt: string
  groupEn: string
  descriptionPt?: string
}

export interface ImportConfirmPayload {
  schoolYearId: string
  rows: ImportRowDTO[]
  newCategories: NewCategoryInput[]
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
