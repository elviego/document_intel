/**
 * Drizzle ORM schema — mirrors the Supabase PostgreSQL migrations exactly.
 * Source of truth for type-safe queries; never edit this without a matching migration.
 */
import {
  pgTable, uuid, text, numeric, boolean, timestamp, integer, pgEnum, date,
} from 'drizzle-orm/pg-core'

// ─── Enums ──────────────────────────────────────────────────────────────────
export const roleEnum          = pgEnum('role',           ['admin', 'staff', 'accountant'])
export const classificationEnum = pgEnum('classification', ['receita', 'despesa'])
export const salaryTypeEnum    = pgEnum('salary_type',    ['contrato', 'rec_verdes', 'horas', 'terceiros'])
export const mealTypeEnum      = pgEnum('meal_type',      ['com_sopa', 'sem_sopa'])

// ─── Tables ──────────────────────────────────────────────────────────────────
export const profiles = pgTable('profiles', {
  id:        uuid('id').primaryKey(),           // = auth.users.id
  fullName:  text('full_name').notNull(),
  role:      roleEnum('role').notNull().default('staff'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const schoolYears = pgTable('school_years', {
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      text('name').notNull().unique(),   // "2025-26"
  startDate: date('start_date').notNull(),
  endDate:   date('end_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const bankAccounts = pgTable('bank_accounts', {
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      text('name').notNull().unique(),
  isActive:  boolean('is_active').notNull().default(true),
})

export const categories = pgTable('categories', {
  id:              uuid('id').primaryKey().defaultRandom(),
  namePt:          text('name_pt').notNull().unique(),
  nameEn:          text('name_en').notNull(),
  classification:  classificationEnum('classification').notNull(),
  groupPt:         text('group_pt').notNull(),
  groupEn:         text('group_en').notNull(),
  descriptionPt:   text('description_pt'),
  descriptionEn:   text('description_en'),
  isActive:        boolean('is_active').notNull().default(true),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
})

export const transactions = pgTable('transactions', {
  id:            uuid('id').primaryKey().defaultRandom(),
  schoolYearId:  uuid('school_year_id').notNull().references(() => schoolYears.id),
  categoryId:    uuid('category_id').notNull().references(() => categories.id),
  bankAccountId: uuid('bank_account_id').notNull().references(() => bankAccounts.id),
  date:          date('date').notNull(),
  monthLabel:    text('month_label').notNull(),         // "set.25"
  amount:        numeric('amount', { precision: 12, scale: 2 }).notNull(),
  description:   text('description').notNull().default(''),
  createdBy:     uuid('created_by').notNull().references(() => profiles.id),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
})

export const budgetEntries = pgTable('budget_entries', {
  id:            uuid('id').primaryKey().defaultRandom(),
  schoolYearId:  uuid('school_year_id').notNull().references(() => schoolYears.id),
  categoryId:    uuid('category_id').notNull().references(() => categories.id),
  month:         integer('month').notNull(),             // 1–12
  plannedAmount: numeric('planned_amount', { precision: 12, scale: 2 }).notNull().default('0'),
})

export const children = pgTable('children', {
  id:           uuid('id').primaryKey().defaultRandom(),
  fullName:     text('full_name').notNull(),
  schoolYearId: uuid('school_year_id').notNull().references(() => schoolYears.id),
  tuitionType:  text('tuition_type').notNull(),
  isActive:     boolean('is_active').notNull().default(true),
})

export const mealPricing = pgTable('meal_pricing', {
  id:           uuid('id').primaryKey().defaultRandom(),
  schoolYearId: uuid('school_year_id').notNull().references(() => schoolYears.id),
  mealType:     mealTypeEnum('meal_type').notNull(),
  schoolCost:   numeric('school_cost',  { precision: 10, scale: 2 }).notNull(),
  parentPrice:  numeric('parent_price', { precision: 10, scale: 2 }).notNull(),
})

export const mealRecords = pgTable('meal_records', {
  id:        uuid('id').primaryKey().defaultRandom(),
  childId:   uuid('child_id').notNull().references(() => children.id),
  date:      date('date').notNull(),
  mealType:  mealTypeEnum('meal_type').notNull(),
  billed:    boolean('billed').notNull().default(false),
  createdBy: uuid('created_by').notNull().references(() => profiles.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const salaryEntries = pgTable('salary_entries', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  schoolYearId:        uuid('school_year_id').notNull().references(() => schoolYears.id),
  personName:          text('person_name').notNull(),
  salaryType:          salaryTypeEnum('salary_type').notNull(),
  serviceName:         text('service_name'),
  baseAmount:          numeric('base_amount',   { precision: 12, scale: 2 }).notNull(),
  month:               integer('month').notNull(),
  actualAmount:        numeric('actual_amount', { precision: 12, scale: 2 }).notNull(),
  linkedTransactionId: uuid('linked_transaction_id').references(() => transactions.id),
  createdAt:           timestamp('created_at').defaultNow().notNull(),
})
