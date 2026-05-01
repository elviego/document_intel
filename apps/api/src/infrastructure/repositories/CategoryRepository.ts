import { eq } from 'drizzle-orm'
import type { DB } from '../db/client'
import { categories } from '../db/schema'
import type { ICategoryRepository } from '../../domain/repositories/ICategoryRepository'
import type { Category, CategoryId, CreateCategoryInput } from '../../domain/entities/Category'

export class CategoryRepository implements ICategoryRepository {
  constructor(private readonly db: DB) {}

  async findAll(includeInactive = false): Promise<Category[]> {
    const rows = includeInactive
      ? await this.db.select().from(categories)
      : await this.db.select().from(categories).where(eq(categories.isActive, true))
    return rows.map(this.#map)
  }

  async findById(id: CategoryId): Promise<Category | null> {
    const rows = await this.db.select().from(categories).where(eq(categories.id, id)).limit(1)
    return rows[0] ? this.#map(rows[0]) : null
  }

  async findByNamePt(name: string): Promise<Category | null> {
    const rows = await this.db.select().from(categories).where(eq(categories.namePt, name)).limit(1)
    return rows[0] ? this.#map(rows[0]) : null
  }

  async create(input: CreateCategoryInput): Promise<Category> {
    const rows = await this.db.insert(categories).values({
      namePt:         input.namePt,
      nameEn:         input.nameEn,
      classification: input.classification,
      groupPt:        input.groupPt,
      groupEn:        input.groupEn,
      descriptionPt:  input.descriptionPt ?? null,
      descriptionEn:  input.descriptionEn ?? null,
    }).returning()
    return this.#map(rows[0])
  }

  async update(id: CategoryId, input: Partial<CreateCategoryInput & { isActive: boolean }>): Promise<Category> {
    const rows = await this.db.update(categories).set(input).where(eq(categories.id, id)).returning()
    return this.#map(rows[0])
  }

  async bulkUpsert(inputs: CreateCategoryInput[]): Promise<Category[]> {
    return Promise.all(inputs.map(async input => {
      const existing = await this.findByNamePt(input.namePt)
      return existing ? this.update(existing.id, input) : this.create(input)
    }))
  }

  #map = (row: typeof categories.$inferSelect): Category => ({
    id:             row.id,
    namePt:         row.namePt,
    nameEn:         row.nameEn,
    classification: row.classification,
    groupPt:        row.groupPt,
    groupEn:        row.groupEn,
    descriptionPt:  row.descriptionPt,
    descriptionEn:  row.descriptionEn,
    isActive:       row.isActive,
    createdAt:      new Date(row.createdAt),
  })
}
