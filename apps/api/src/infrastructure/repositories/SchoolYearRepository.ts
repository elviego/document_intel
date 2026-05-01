import { eq } from 'drizzle-orm'
import type { DB } from '../db/client'
import { schoolYears } from '../db/schema'
import type { SchoolYear, SchoolYearId } from '../../domain/entities/SchoolYear'

export interface ISchoolYearRepository {
  findAll(): Promise<SchoolYear[]>
  findById(id: SchoolYearId): Promise<SchoolYear | null>
  create(input: Omit<SchoolYear, 'id' | 'createdAt'>): Promise<SchoolYear>
}

export class SchoolYearRepository implements ISchoolYearRepository {
  constructor(private readonly db: DB) {}

  async findAll(): Promise<SchoolYear[]> {
    const rows = await this.db.select().from(schoolYears).orderBy(schoolYears.startDate)
    return rows.map(this.#map)
  }

  async findById(id: SchoolYearId): Promise<SchoolYear | null> {
    const rows = await this.db.select().from(schoolYears).where(eq(schoolYears.id, id)).limit(1)
    return rows[0] ? this.#map(rows[0]) : null
  }

  async create(input: Omit<SchoolYear, 'id' | 'createdAt'>): Promise<SchoolYear> {
    const rows = await this.db.insert(schoolYears).values({
      name:      input.name,
      startDate: input.startDate.toISOString().slice(0, 10),
      endDate:   input.endDate.toISOString().slice(0, 10),
    }).returning()
    return this.#map(rows[0])
  }

  #map = (row: typeof schoolYears.$inferSelect): SchoolYear => ({
    id:        row.id,
    name:      row.name,
    startDate: new Date(row.startDate),
    endDate:   new Date(row.endDate),
    createdAt: new Date(row.createdAt),
  })
}
