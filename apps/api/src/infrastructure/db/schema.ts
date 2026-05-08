/**
 * Drizzle ORM schema — mirrors db/migrations exactly.
 * Source of truth for type-safe queries; never edit this without a matching migration.
 */
import {
  pgTable, uuid, text, numeric, boolean, timestamp, integer, pgEnum, date, index,
} from 'drizzle-orm/pg-core'

// ─── Enums ──────────────────────────────────────────────────────────────────
export const roleEnum           = pgEnum('role',           ['admin', 'staff', 'accountant'])
export const classificationEnum = pgEnum('classification', ['receita', 'despesa'])
export const salaryTypeEnum     = pgEnum('salary_type',    ['contrato', 'rec_verdes', 'horas', 'terceiros'])
export const mealTypeEnum       = pgEnum('meal_type',      ['com_sopa', 'sem_sopa'])

// ─── Tables ──────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id:               uuid('id').primaryKey().defaultRandom(),
  email:            text('email').notNull().unique(),
  passwordHash:     text('password_hash'),
  fullName:         text('full_name').notNull().default(''),
  role:             roleEnum('role').notNull().default('staff'),
  inviteToken:      text('invite_token').unique(),
  inviteExpiresAt:  timestamp('invite_expires_at'),
  isActive:         boolean('is_active').notNull().default(false),
  createdAt:        timestamp('created_at').defaultNow().notNull(),
  updatedAt:        timestamp('updated_at').defaultNow().notNull(),
})

export const schoolYears = pgTable('school_years', {
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      text('name').notNull().unique(),   // "2025-26"
  startDate: date('start_date').notNull(),
  endDate:   date('end_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const enrollmentPlans = pgTable('enrollment_plans', {
  id:              uuid('id').primaryKey().defaultRandom(),
  name:            text('name').notNull(),
  description:     text('description'),
  scheduleType:    text('schedule_type').notNull().default('custom'),
  daysPerWeek:     integer('days_per_week'),
  morningsOnly:    boolean('mornings_only').notNull().default(false),
  billingCycle:    text('billing_cycle').notNull().default('monthly'),
  baseAmount:      numeric('base_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  discountPercent: numeric('discount_percent', { precision: 5, scale: 2 }),
  discountFixed:   numeric('discount_fixed', { precision: 10, scale: 2 }),
  isPreset:        boolean('is_preset').notNull().default(false),
  isActive:        boolean('is_active').notNull().default(true),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
})

export const bankAccounts = pgTable('bank_accounts', {
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      text('name').notNull().unique(),
  iban:      text('iban'),
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
  createdBy:     uuid('created_by').notNull().references(() => users.id),
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
  id:              uuid('id').primaryKey().defaultRandom(),
  fullName:        text('full_name').notNull(),
  schoolYearId:    uuid('school_year_id').notNull().references(() => schoolYears.id),
  tuitionType:     text('tuition_type').notNull(),
  isActive:        boolean('is_active').notNull().default(true),
  // Extended profile
  firstName:       text('first_name'),
  lastName:        text('last_name'),
  birthDate:       date('birth_date'),
  nationality:     text('nationality').default('Portuguesa'),
  nif:             text('nif'),
  address:         text('address'),
  bloodType:       text('blood_type'),
  allergies:       text('allergies'),
  medicalNotes:    text('medical_notes'),
  photoConsent:    boolean('photo_consent').notNull().default(false),
  enrollmentDate:  date('enrollment_date'),
  planId:          uuid('plan_id').references(() => enrollmentPlans.id),
  // Parent / guardian 1
  parent1FirstName: text('parent1_first_name'),
  parent1LastName:  text('parent1_last_name'),
  parent1Phone:     text('parent1_phone'),
  parent1Email:     text('parent1_email'),
  parent1Relation:  text('parent1_relation').default('Mãe/Pai'),
  // Parent / guardian 2
  parent2FirstName: text('parent2_first_name'),
  parent2LastName:  text('parent2_last_name'),
  parent2Phone:     text('parent2_phone'),
  parent2Email:     text('parent2_email'),
  parent2Relation:  text('parent2_relation'),
  // Emergency contact
  emergencyContact: text('emergency_contact'),
  emergencyPhone:   text('emergency_phone'),
  notes:            text('notes'),
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
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const employees = pgTable('employees', {
  id:           uuid('id').primaryKey().defaultRandom(),
  fullName:     text('full_name').notNull(),
  position:     text('position').notNull().default(''),
  contractType: text('contract_type').notNull().default('contrato'),
  email:        text('email'),
  phone:        text('phone'),
  nif:          text('nif'),
  iban:         text('iban'),
  baseSalary:   numeric('base_salary', { precision: 12, scale: 2 }).notNull().default('0'),
  startDate:    date('start_date'),
  endDate:      date('end_date'),
  isActive:     boolean('is_active').notNull().default(true),
  notes:        text('notes'),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
})

export const activities = pgTable('activities', {
  id:           uuid('id').primaryKey().defaultRandom(),
  schoolYearId: uuid('school_year_id').notNull().references(() => schoolYears.id),
  name:         text('name').notNull(),
  description:  text('description'),
  schedule:     text('schedule'),
  capacity:     integer('capacity'),
  isActive:     boolean('is_active').notNull().default(true),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
})

export const studentActivities = pgTable('student_activities', {
  id:         uuid('id').primaryKey().defaultRandom(),
  studentId:  uuid('student_id').notNull().references(() => children.id),
  activityId: uuid('activity_id').notNull().references(() => activities.id),
  enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
})

export const wages = pgTable('wages', {
  id:                uuid('id').primaryKey().defaultRandom(),
  employeeId:        uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  effectiveFrom:     date('effective_from').notNull(),
  grossAmount:       numeric('gross_amount',        { precision: 12, scale: 2 }).notNull(),
  contractType:      text('contract_type').notNull().default('sem_termo'),
  maritalStatus:     text('marital_status').notNull().default('nao_casado'),
  dependents:        integer('dependents').notNull().default(0),
  irsRate:           numeric('irs_rate',            { precision: 6,  scale: 4 }).notNull().default('0'),
  irsAmount:         numeric('irs_amount',          { precision: 12, scale: 2 }).notNull().default('0'),
  ssEmployeeRate:    numeric('ss_employee_rate',    { precision: 6,  scale: 4 }).notNull().default('0'),
  ssEmployeeAmount:  numeric('ss_employee_amount',  { precision: 12, scale: 2 }).notNull().default('0'),
  ssEmployerRate:    numeric('ss_employer_rate',    { precision: 6,  scale: 4 }).notNull().default('0'),
  ssEmployerAmount:  numeric('ss_employer_amount',  { precision: 12, scale: 2 }).notNull().default('0'),
  netAmount:         numeric('net_amount',          { precision: 12, scale: 2 }).notNull().default('0'),
  totalEmployerCost: numeric('total_employer_cost', { precision: 12, scale: 2 }).notNull().default('0'),
  notes:             text('notes'),
  createdAt:         timestamp('created_at').defaultNow().notNull(),
})

// ─── OCR Module ──────────────────────────────────────────────────────────────
export const ocrDocumentTypeEnum = pgEnum('ocr_document_type', [
  'invoice', 'receipt', 'contract', 'id_document', 'medical', 'bank_statement', 'form', 'other',
])
export const ocrStatusEnum       = pgEnum('ocr_status',        ['pending', 'processing', 'completed', 'failed'])
export const llmProviderTypeEnum = pgEnum('llm_provider_type', ['openai', 'anthropic', 'ollama', 'deepseek', 'custom'])

export const ocrLlmProviders = pgTable('ocr_llm_providers', {
  id:           uuid('id').primaryKey().defaultRandom(),
  name:         text('name').notNull(),
  providerType: llmProviderTypeEnum('provider_type').notNull(),
  baseUrl:      text('base_url'),
  apiKey:       text('api_key'),
  defaultModel: text('default_model').notNull(),
  isActive:     boolean('is_active').notNull().default(true),
  isDefault:    boolean('is_default').notNull().default(false),
  config:       text('config'),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  updatedAt:    timestamp('updated_at').defaultNow().notNull(),
})

export const ocrDocumentConfigs = pgTable('ocr_document_configs', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  documentType:         ocrDocumentTypeEnum('document_type').notNull().unique(),
  ocrEngine:            text('ocr_engine').notNull().default('tesseract'),
  ocrLanguage:          text('ocr_language').notNull().default('por+eng'),
  ocrDpi:               integer('ocr_dpi').default(300),
  preprocessingEnabled: boolean('preprocessing_enabled').notNull().default(true),
  llmProviderId:        uuid('llm_provider_id').references(() => ocrLlmProviders.id),
  llmModel:             text('llm_model'),
  llmPromptTemplate:    text('llm_prompt_template'),
  structuredSchema:     text('structured_schema'),
  createdAt:            timestamp('created_at').defaultNow().notNull(),
  updatedAt:            timestamp('updated_at').defaultNow().notNull(),
})

export const ocrDocuments = pgTable('ocr_documents', {
  id:             uuid('id').primaryKey().defaultRandom(),
  fileName:       text('file_name').notNull(),
  filePath:       text('file_path').notNull(),
  fileSizeBytes:  integer('file_size_bytes').notNull(),
  mimeType:       text('mime_type').notNull(),
  pageCount:      integer('page_count'),
  documentType:   ocrDocumentTypeEnum('document_type'),
  autoDetectType: boolean('auto_detect_type').notNull().default(true),
  status:         ocrStatusEnum('status').notNull().default('pending'),
  uploadedBy:     uuid('uploaded_by').references(() => users.id),
  createdAt:      timestamp('created_at').defaultNow().notNull(),
  updatedAt:      timestamp('updated_at').defaultNow().notNull(),
})

export const ocrJobs = pgTable('ocr_jobs', {
  id:               uuid('id').primaryKey().defaultRandom(),
  documentId:       uuid('document_id').notNull().references(() => ocrDocuments.id, { onDelete: 'cascade' }),
  status:           ocrStatusEnum('status').notNull().default('pending'),
  ocrEngine:        text('ocr_engine').notNull().default('tesseract'),
  ocrEngineVersion: text('ocr_engine_version'),
  llmProviderId:    uuid('llm_provider_id').references(() => ocrLlmProviders.id),
  llmModel:         text('llm_model'),
  rawText:          text('raw_text'),
  metadata:         text('metadata'),
  errorMessage:     text('error_message'),
  startedAt:        timestamp('started_at'),
  completedAt:      timestamp('completed_at'),
  createdAt:        timestamp('created_at').defaultNow().notNull(),
})

export const ocrMetrics = pgTable('ocr_metrics', {
  id:                uuid('id').primaryKey().defaultRandom(),
  jobId:             uuid('job_id').notNull().references(() => ocrJobs.id, { onDelete: 'cascade' }),
  documentId:        uuid('document_id').notNull().references(() => ocrDocuments.id, { onDelete: 'cascade' }),
  overallConfidence: numeric('overall_confidence', { precision: 5, scale: 4 }),
  pageConfidences:   text('page_confidences'),
  characterCount:    integer('character_count'),
  wordCount:         integer('word_count'),
  processingTimeMs:  integer('processing_time_ms').notNull(),
  ocrEngine:         text('ocr_engine').notNull(),
  ocrEngineVersion:  text('ocr_engine_version'),
  llmModel:          text('llm_model'),
  llmProvider:       text('llm_provider'),
  llmTokensUsed:     integer('llm_tokens_used'),
  documentType:      ocrDocumentTypeEnum('document_type'),
  autoDetectedType:  boolean('auto_detected_type'),
  createdAt:         timestamp('created_at').defaultNow().notNull(),
})

// ─── Salary Entries ───────────────────────────────────────────────────────────
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
