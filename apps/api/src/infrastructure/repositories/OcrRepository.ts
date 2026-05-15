import { eq, desc, count, avg, sql, gte, and } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../db/schema.js'
import type {
  IOcrRepository, CreateDocumentInput, CreateJobInput,
  UpdateJobInput, CreateMetricInput, OcrWebhook,
} from '../../domain/repositories/IOcrRepository.js'
import type {
  OcrDocument, OcrJob, OcrMetric, LlmProvider,
  OcrDocumentConfig, OcrDocumentType, OcrStatus, OcrResultMetadata,
} from '../../domain/entities/OcrDocument.js'
import { NotFoundError } from '../../shared/errors.js'

type DB = PostgresJsDatabase<typeof schema>

function parseJson<T>(s: string | null | undefined): T | null {
  if (!s) return null
  try { return JSON.parse(s) as T } catch { return null }
}

function mapDoc(row: typeof schema.ocrDocuments.$inferSelect): OcrDocument {
  return {
    id:             row.id,
    fileName:       row.fileName,
    filePath:       row.filePath,
    fileSizeBytes:  row.fileSizeBytes,
    mimeType:       row.mimeType,
    pageCount:      row.pageCount,
    documentType:   row.documentType as OcrDocumentType | null,
    autoDetectType: row.autoDetectType,
    status:         row.status as OcrStatus,
    uploadedBy:     row.uploadedBy,
    createdAt:      row.createdAt,
    updatedAt:      row.updatedAt,
  }
}

function mapJob(row: typeof schema.ocrJobs.$inferSelect): OcrJob {
  return {
    id:               row.id,
    documentId:       row.documentId,
    status:           row.status as OcrStatus,
    ocrEngine:        row.ocrEngine,
    ocrEngineVersion: row.ocrEngineVersion,
    llmProviderId:    row.llmProviderId,
    llmModel:         row.llmModel,
    rawText:          row.rawText,
    metadata:         parseJson<OcrResultMetadata>(row.metadata),
    errorMessage:     row.errorMessage,
    startedAt:        row.startedAt,
    completedAt:      row.completedAt,
    createdAt:        row.createdAt,
  }
}

function mapMetric(row: typeof schema.ocrMetrics.$inferSelect): OcrMetric {
  return {
    id:                row.id,
    jobId:             row.jobId,
    documentId:        row.documentId,
    overallConfidence: row.overallConfidence ? Number(row.overallConfidence) : null,
    pageConfidences:   parseJson<number[]>(row.pageConfidences),
    characterCount:    row.characterCount,
    wordCount:         row.wordCount,
    processingTimeMs:  row.processingTimeMs,
    ocrEngine:         row.ocrEngine,
    ocrEngineVersion:  row.ocrEngineVersion,
    llmModel:          row.llmModel,
    llmProvider:       row.llmProvider,
    llmTokensUsed:     row.llmTokensUsed,
    documentType:      row.documentType as OcrDocumentType | null,
    autoDetectedType:  row.autoDetectedType,
    createdAt:         row.createdAt,
  }
}

function mapProvider(row: typeof schema.ocrLlmProviders.$inferSelect): LlmProvider {
  return {
    id:           row.id,
    name:         row.name,
    providerType: row.providerType,
    baseUrl:      row.baseUrl,
    apiKey:       row.apiKey,
    defaultModel: row.defaultModel,
    isActive:     row.isActive,
    isDefault:    row.isDefault,
    config:       parseJson<Record<string, unknown>>(row.config),
    createdAt:    row.createdAt,
    updatedAt:    row.updatedAt,
  }
}

function mapConfig(row: typeof schema.ocrDocumentConfigs.$inferSelect): OcrDocumentConfig {
  return {
    id:                   row.id,
    documentType:         row.documentType as OcrDocumentType,
    ocrEngine:            row.ocrEngine,
    ocrLanguage:          row.ocrLanguage,
    ocrDpi:               row.ocrDpi,
    preprocessingEnabled: row.preprocessingEnabled,
    llmProviderId:        row.llmProviderId,
    llmModel:             row.llmModel,
    llmPromptTemplate:    row.llmPromptTemplate,
    structuredSchema:     parseJson<Record<string, unknown>>(row.structuredSchema),
    createdAt:            row.createdAt,
    updatedAt:            row.updatedAt,
  }
}

export class OcrRepository implements IOcrRepository {
  constructor(private readonly db: DB) {}

  // ── Documents ───────────────────────────────────────────────────────────────

  async createDocument(input: CreateDocumentInput): Promise<OcrDocument> {
    const [row] = await this.db.insert(schema.ocrDocuments).values({
      fileName:       input.fileName,
      filePath:       input.filePath,
      fileSizeBytes:  input.fileSizeBytes,
      mimeType:       input.mimeType,
      pageCount:      input.pageCount,
      documentType:   input.documentType as any,
      autoDetectType: input.autoDetectType,
      uploadedBy:     input.uploadedBy,
    }).returning()
    return mapDoc(row)
  }

  async findDocumentById(id: string): Promise<OcrDocument | null> {
    const [row] = await this.db.select().from(schema.ocrDocuments).where(eq(schema.ocrDocuments.id, id))
    return row ? mapDoc(row) : null
  }

  async listDocuments(opts?: { limit?: number; offset?: number; status?: OcrStatus; documentType?: OcrDocumentType }) {
    const limit  = opts?.limit  ?? 50
    const offset = opts?.offset ?? 0

    const rows = await this.db.select().from(schema.ocrDocuments)
      .orderBy(desc(schema.ocrDocuments.createdAt))
      .limit(limit).offset(offset)

    const [{ total }] = await this.db.select({ total: count() }).from(schema.ocrDocuments)
    return { items: rows.map(mapDoc), total }
  }

  async updateDocumentStatus(id: string, status: OcrStatus, documentType?: OcrDocumentType, pageCount?: number): Promise<void> {
    await this.db.update(schema.ocrDocuments)
      .set({
        status:       status as any,
        documentType: (documentType ?? undefined) as any,
        pageCount:    pageCount,
        updatedAt:    new Date(),
      })
      .where(eq(schema.ocrDocuments.id, id))
  }

  // ── Jobs ────────────────────────────────────────────────────────────────────

  async createJob(input: CreateJobInput): Promise<OcrJob> {
    const [row] = await this.db.insert(schema.ocrJobs).values({
      documentId:       input.documentId,
      ocrEngine:        input.ocrEngine,
      ocrEngineVersion: input.ocrEngineVersion,
      llmProviderId:    input.llmProviderId,
      llmModel:         input.llmModel,
    }).returning()
    return mapJob(row)
  }

  async findJobById(id: string): Promise<OcrJob | null> {
    const [row] = await this.db.select().from(schema.ocrJobs).where(eq(schema.ocrJobs.id, id))
    return row ? mapJob(row) : null
  }

  async findLatestJobForDocument(documentId: string): Promise<OcrJob | null> {
    const [row] = await this.db.select().from(schema.ocrJobs)
      .where(eq(schema.ocrJobs.documentId, documentId))
      .orderBy(desc(schema.ocrJobs.createdAt))
      .limit(1)
    return row ? mapJob(row) : null
  }

  async listJobsForDocument(documentId: string, limit = 50): Promise<OcrJob[]> {
    const rows = await this.db.select().from(schema.ocrJobs)
      .where(eq(schema.ocrJobs.documentId, documentId))
      .orderBy(desc(schema.ocrJobs.createdAt))
      .limit(limit)
    return rows.map(mapJob)
  }

  async updateJob(id: string, input: UpdateJobInput): Promise<void> {
    await this.db.update(schema.ocrJobs)
      .set({
        status:           input.status as any,
        rawText:          input.rawText,
        metadata:         input.metadata ? JSON.stringify(input.metadata) : undefined,
        errorMessage:     input.errorMessage,
        startedAt:        input.startedAt,
        completedAt:      input.completedAt,
        ocrEngineVersion: input.ocrEngineVersion,
        llmModel:         input.llmModel,
      })
      .where(eq(schema.ocrJobs.id, id))
  }

  // ── Metrics ─────────────────────────────────────────────────────────────────

  async createMetric(input: CreateMetricInput): Promise<OcrMetric> {
    const [row] = await this.db.insert(schema.ocrMetrics).values({
      jobId:             input.jobId,
      documentId:        input.documentId,
      overallConfidence: input.overallConfidence != null ? String(input.overallConfidence) : null,
      pageConfidences:   input.pageConfidences   != null ? JSON.stringify(input.pageConfidences) : null,
      characterCount:    input.characterCount,
      wordCount:         input.wordCount,
      processingTimeMs:  input.processingTimeMs,
      ocrEngine:         input.ocrEngine,
      ocrEngineVersion:  input.ocrEngineVersion,
      llmModel:          input.llmModel,
      llmProvider:       input.llmProvider,
      llmTokensUsed:     input.llmTokensUsed,
      documentType:      (input.documentType ?? null) as any,
      autoDetectedType:  input.autoDetectedType,
    }).returning()
    return mapMetric(row)
  }

  async listMetrics(opts?: { limit?: number; offset?: number; documentId?: string }): Promise<OcrMetric[]> {
    const rows = await this.db.select().from(schema.ocrMetrics)
      .orderBy(desc(schema.ocrMetrics.createdAt))
      .limit(opts?.limit ?? 100)
      .offset(opts?.offset ?? 0)
    return rows.map(mapMetric)
  }

  async metricsAggregate() {
    const [totals] = await this.db.select({
      totalDocuments: count(),
      avgConfidence:  avg(schema.ocrMetrics.overallConfidence),
      avgProcessingMs: avg(schema.ocrMetrics.processingTimeMs),
    }).from(schema.ocrMetrics)

    const byEngine = await this.db
      .select({ engine: schema.ocrMetrics.ocrEngine, count: count() })
      .from(schema.ocrMetrics)
      .groupBy(schema.ocrMetrics.ocrEngine)

    const byDocType = await this.db
      .select({ documentType: schema.ocrMetrics.documentType, count: count() })
      .from(schema.ocrMetrics)
      .groupBy(schema.ocrMetrics.documentType)

    const byLlm = await this.db
      .select({ model: schema.ocrMetrics.llmModel, count: count() })
      .from(schema.ocrMetrics)
      .groupBy(schema.ocrMetrics.llmModel)

    return {
      totalDocuments:  Number(totals.totalDocuments),
      avgConfidence:   totals.avgConfidence != null ? Number(totals.avgConfidence) : null,
      avgProcessingMs: totals.avgProcessingMs != null ? Number(totals.avgProcessingMs) : null,
      byEngine:        byEngine.map(r => ({ engine: r.engine, count: Number(r.count) })),
      byDocType:       byDocType.map(r => ({ documentType: r.documentType ?? 'unknown', count: Number(r.count) })),
      byLlmModel:      byLlm.filter(r => r.model).map(r => ({ model: r.model!, count: Number(r.count) })),
    }
  }

  // ── LLM Providers ───────────────────────────────────────────────────────────

  async listProviders(): Promise<LlmProvider[]> {
    const rows = await this.db.select().from(schema.ocrLlmProviders).orderBy(schema.ocrLlmProviders.name)
    return rows.map(mapProvider)
  }

  async findProviderById(id: string): Promise<LlmProvider | null> {
    const [row] = await this.db.select().from(schema.ocrLlmProviders).where(eq(schema.ocrLlmProviders.id, id))
    return row ? mapProvider(row) : null
  }

  async findDefaultProvider(): Promise<LlmProvider | null> {
    const [row] = await this.db.select().from(schema.ocrLlmProviders)
      .where(eq(schema.ocrLlmProviders.isDefault, true))
      .limit(1)
    return row ? mapProvider(row) : null
  }

  async createProvider(input: Omit<LlmProvider, 'id' | 'createdAt' | 'updatedAt'>): Promise<LlmProvider> {
    const [row] = await this.db.insert(schema.ocrLlmProviders).values({
      name:         input.name,
      providerType: input.providerType as any,
      baseUrl:      input.baseUrl,
      apiKey:       input.apiKey,
      defaultModel: input.defaultModel,
      isActive:     input.isActive,
      isDefault:    input.isDefault,
      config:       input.config ? JSON.stringify(input.config) : null,
    }).returning()
    return mapProvider(row)
  }

  async updateProvider(id: string, input: Partial<Omit<LlmProvider, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LlmProvider> {
    const [row] = await this.db.update(schema.ocrLlmProviders)
      .set({
        name:         input.name,
        providerType: input.providerType as any,
        baseUrl:      input.baseUrl,
        apiKey:       input.apiKey,
        defaultModel: input.defaultModel,
        isActive:     input.isActive,
        isDefault:    input.isDefault,
        config:       input.config != null ? JSON.stringify(input.config) : undefined,
        updatedAt:    new Date(),
      })
      .where(eq(schema.ocrLlmProviders.id, id))
      .returning()
    if (!row) throw new NotFoundError('LLM provider')
    return mapProvider(row)
  }

  async deleteProvider(id: string): Promise<void> {
    await this.db.delete(schema.ocrLlmProviders).where(eq(schema.ocrLlmProviders.id, id))
  }

  async setDefaultProvider(id: string): Promise<void> {
    await this.db.update(schema.ocrLlmProviders).set({ isDefault: false })
    await this.db.update(schema.ocrLlmProviders)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(schema.ocrLlmProviders.id, id))
  }

  // ── Configs ─────────────────────────────────────────────────────────────────

  async listConfigs(): Promise<OcrDocumentConfig[]> {
    const rows = await this.db.select().from(schema.ocrDocumentConfigs).orderBy(schema.ocrDocumentConfigs.documentType)
    return rows.map(mapConfig)
  }

  async findConfigByType(documentType: OcrDocumentType): Promise<OcrDocumentConfig | null> {
    const [row] = await this.db.select().from(schema.ocrDocumentConfigs)
      .where(eq(schema.ocrDocumentConfigs.documentType, documentType as any))
    return row ? mapConfig(row) : null
  }

  async upsertConfig(documentType: OcrDocumentType, input: Partial<Omit<OcrDocumentConfig, 'id' | 'documentType' | 'createdAt' | 'updatedAt'>>): Promise<OcrDocumentConfig> {
    const existing = await this.findConfigByType(documentType)
    if (existing) {
      const [row] = await this.db.update(schema.ocrDocumentConfigs)
        .set({
          ocrEngine:            input.ocrEngine,
          ocrLanguage:          input.ocrLanguage,
          ocrDpi:               input.ocrDpi,
          preprocessingEnabled: input.preprocessingEnabled,
          llmProviderId:        input.llmProviderId,
          llmModel:             input.llmModel,
          llmPromptTemplate:    input.llmPromptTemplate,
          structuredSchema:     input.structuredSchema ? JSON.stringify(input.structuredSchema) : undefined,
          updatedAt:            new Date(),
        })
        .where(eq(schema.ocrDocumentConfigs.id, existing.id))
        .returning()
      return mapConfig(row)
    }

    const [row] = await this.db.insert(schema.ocrDocumentConfigs).values({
      documentType:         documentType as any,
      ocrEngine:            input.ocrEngine ?? 'tesseract',
      ocrLanguage:          input.ocrLanguage ?? 'por+eng',
      ocrDpi:               input.ocrDpi,
      preprocessingEnabled: input.preprocessingEnabled ?? true,
      llmProviderId:        input.llmProviderId,
      llmModel:             input.llmModel,
      llmPromptTemplate:    input.llmPromptTemplate,
      structuredSchema:     input.structuredSchema ? JSON.stringify(input.structuredSchema) : null,
    }).returning()
    return mapConfig(row)
  }

  // ── Document delete ──────────────────────────────────────────────────────────

  async deleteDocument(id: string): Promise<void> {
    await this.db.delete(schema.ocrDocuments).where(eq(schema.ocrDocuments.id, id))
  }

  // ── Metrics trending ─────────────────────────────────────────────────────────

  async metricsTrending(days: number, documentType?: OcrDocumentType) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const conditions = documentType
      ? and(gte(schema.ocrMetrics.createdAt, since), eq(schema.ocrMetrics.documentType, documentType as any))
      : gte(schema.ocrMetrics.createdAt, since)

    const rows = await this.db
      .select({
        date:            sql<string>`to_char(${schema.ocrMetrics.createdAt}, 'YYYY-MM-DD')`,
        avgConfidence:   avg(schema.ocrMetrics.overallConfidence),
        count:           count(),
        avgProcessingMs: avg(schema.ocrMetrics.processingTimeMs),
      })
      .from(schema.ocrMetrics)
      .where(conditions)
      .groupBy(sql`to_char(${schema.ocrMetrics.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${schema.ocrMetrics.createdAt}, 'YYYY-MM-DD')`)

    return rows.map(r => ({
      date:            r.date,
      avgConfidence:   r.avgConfidence != null ? Number(r.avgConfidence) : null,
      count:           Number(r.count),
      avgProcessingMs: r.avgProcessingMs != null ? Number(r.avgProcessingMs) : null,
    }))
  }

  // ── Webhooks ─────────────────────────────────────────────────────────────────

  private mapWebhook(row: typeof schema.ocrWebhooks.$inferSelect): OcrWebhook {
    return {
      id:        row.id,
      name:      row.name,
      url:       row.url,
      secret:    row.secret,
      events:    parseJson<string[]>(row.events) ?? [],
      isActive:  row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  async listWebhooks(): Promise<OcrWebhook[]> {
    const rows = await this.db.select().from(schema.ocrWebhooks).orderBy(schema.ocrWebhooks.name)
    return rows.map(r => this.mapWebhook(r))
  }

  async listActiveWebhooks(): Promise<OcrWebhook[]> {
    const rows = await this.db.select().from(schema.ocrWebhooks)
      .where(eq(schema.ocrWebhooks.isActive, true))
    return rows.map(r => this.mapWebhook(r))
  }

  async findWebhookById(id: string): Promise<OcrWebhook | null> {
    const [row] = await this.db.select().from(schema.ocrWebhooks).where(eq(schema.ocrWebhooks.id, id))
    return row ? this.mapWebhook(row) : null
  }

  async createWebhook(input: Omit<OcrWebhook, 'id' | 'createdAt' | 'updatedAt'>): Promise<OcrWebhook> {
    const [row] = await this.db.insert(schema.ocrWebhooks).values({
      name:     input.name,
      url:      input.url,
      secret:   input.secret,
      events:   JSON.stringify(input.events),
      isActive: input.isActive,
    }).returning()
    return this.mapWebhook(row)
  }

  async updateWebhook(id: string, input: Partial<Omit<OcrWebhook, 'id' | 'createdAt' | 'updatedAt'>>): Promise<OcrWebhook> {
    const [row] = await this.db.update(schema.ocrWebhooks)
      .set({
        name:      input.name,
        url:       input.url,
        secret:    input.secret,
        events:    input.events ? JSON.stringify(input.events) : undefined,
        isActive:  input.isActive,
        updatedAt: new Date(),
      })
      .where(eq(schema.ocrWebhooks.id, id))
      .returning()
    if (!row) throw new NotFoundError('Webhook')
    return this.mapWebhook(row)
  }

  async deleteWebhook(id: string): Promise<void> {
    await this.db.delete(schema.ocrWebhooks).where(eq(schema.ocrWebhooks.id, id))
  }

  async createWebhookDelivery(input: {
    webhookId: string; event: string; payload: string;
    status: 'success' | 'failed'; responseStatus?: number; errorMessage?: string
  }): Promise<void> {
    await this.db.insert(schema.ocrWebhookDeliveries).values({
      webhookId:      input.webhookId,
      event:          input.event,
      payload:        input.payload,
      status:         input.status,
      responseStatus: input.responseStatus,
      errorMessage:   input.errorMessage,
    })
  }
}
