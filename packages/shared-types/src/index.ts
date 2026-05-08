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
  iban: string | null
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

// ─── Enrollment Plan ─────────────────────────────────────────────────────────
export type ScheduleType = 'full_time' | 'part_time_days' | 'part_time_mornings' | 'holiday' | 'custom'
export type BillingCycle = 'monthly' | 'trimestral' | 'annual'

export interface EnrollmentPlanDTO {
  id: string
  name: string
  description: string | null
  scheduleType: ScheduleType
  daysPerWeek: number | null
  morningsOnly: boolean
  billingCycle: BillingCycle
  baseAmount: number
  discountPercent: number | null
  discountFixed: number | null
  isPreset: boolean
  isActive: boolean
}

export interface CreateEnrollmentPlanDTO {
  name: string
  description?: string
  scheduleType: ScheduleType
  daysPerWeek?: number
  morningsOnly?: boolean
  billingCycle?: BillingCycle
  baseAmount: number
  discountPercent?: number
  discountFixed?: number
}

// ─── Student (extended child profile) ────────────────────────────────────────
export interface StudentDTO {
  id: string
  fullName: string
  schoolYearId: string
  tuitionType: string
  isActive: boolean
  // Personal
  firstName: string | null
  lastName: string | null
  birthDate: string | null
  nationality: string | null
  nif: string | null
  address: string | null
  bloodType: string | null
  allergies: string | null
  medicalNotes: string | null
  photoConsent: boolean
  enrollmentDate: string | null
  plan: EnrollmentPlanDTO | null
  // Guardian 1
  parent1FirstName: string | null
  parent1LastName: string | null
  parent1Phone: string | null
  parent1Email: string | null
  parent1Relation: string | null
  // Guardian 2
  parent2FirstName: string | null
  parent2LastName: string | null
  parent2Phone: string | null
  parent2Email: string | null
  parent2Relation: string | null
  // Emergency
  emergencyContact: string | null
  emergencyPhone: string | null
  notes: string | null
}

export interface CreateStudentDTO {
  fullName: string
  schoolYearId: string
  tuitionType: string
  firstName?: string
  lastName?: string
  birthDate?: string
  nationality?: string
  nif?: string
  address?: string
  bloodType?: string
  allergies?: string
  medicalNotes?: string
  photoConsent?: boolean
  enrollmentDate?: string
  planId?: string
  parent1FirstName?: string
  parent1LastName?: string
  parent1Phone?: string
  parent1Email?: string
  parent1Relation?: string
  parent2FirstName?: string
  parent2LastName?: string
  parent2Phone?: string
  parent2Email?: string
  parent2Relation?: string
  emergencyContact?: string
  emergencyPhone?: string
  notes?: string
}

// ─── Wages ───────────────────────────────────────────────────────────────────
export type WageContractType  = 'sem_termo' | 'a_termo' | 'rec_verdes' | 'horas'
export type WageMaritalStatus = 'nao_casado' | 'casado_2_titulares' | 'casado_1_titular'

export interface WageDTO {
  id: string
  employeeId: string
  effectiveFrom: string
  grossAmount: number
  contractType: WageContractType
  maritalStatus: WageMaritalStatus
  dependents: number
  irsRate: number
  irsAmount: number
  ssEmployeeRate: number
  ssEmployeeAmount: number
  ssEmployerRate: number
  ssEmployerAmount: number
  netAmount: number
  totalEmployerCost: number
  notes: string | null
  createdAt: string
}

export interface CreateWageDTO {
  employeeId: string
  effectiveFrom: string
  grossAmount: number
  contractType: WageContractType
  maritalStatus: WageMaritalStatus
  dependents: number
  notes?: string
}

export interface WagePreviewDTO {
  grossAmount: number
  contractType: WageContractType
  maritalStatus: WageMaritalStatus
  dependents: number
  irsRate: number
  irsAmount: number
  ssEmployeeRate: number
  ssEmployeeAmount: number
  ssEmployerRate: number
  ssEmployerAmount: number
  netAmount: number
  totalEmployerCost: number
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
