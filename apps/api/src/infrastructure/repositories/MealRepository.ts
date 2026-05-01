import { eq, and, gte, lte } from 'drizzle-orm'
import type { DB } from '../db/client'
import { mealRecords, mealPricing, children } from '../db/schema'
import type { IMealRepository } from '../../domain/repositories/IMealRepository'
import type { MealRecord, MealPricing, Child } from '../../domain/entities/MealRecord'

export class MealRepository implements IMealRepository {
  constructor(private readonly db: DB) {}

  async findRecords(childId?: string, from?: Date, to?: Date): Promise<MealRecord[]> {
    const conditions = [
      childId ? eq(mealRecords.childId, childId) : undefined,
      from    ? gte(mealRecords.date, from.toISOString().slice(0,10)) : undefined,
      to      ? lte(mealRecords.date, to.toISOString().slice(0,10))   : undefined,
    ].filter(Boolean) as ReturnType<typeof eq>[]

    const rows = await this.db.select().from(mealRecords)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(mealRecords.date)
    return rows.map(this.#mapRecord)
  }

  async createRecord(input: Omit<MealRecord, 'id' | 'createdAt'>): Promise<MealRecord> {
    const rows = await this.db.insert(mealRecords).values({
      childId:   input.childId,
      date:      input.date.toISOString().slice(0, 10),
      mealType:  input.mealType,
      billed:    input.billed,
      createdBy: input.createdBy,
    }).returning()
    return this.#mapRecord(rows[0])
  }

  async deleteRecord(id: string): Promise<void> {
    await this.db.delete(mealRecords).where(eq(mealRecords.id, id))
  }

  async findPricing(schoolYearId: string): Promise<MealPricing[]> {
    const rows = await this.db.select().from(mealPricing)
      .where(eq(mealPricing.schoolYearId, schoolYearId))
    return rows.map(this.#mapPricing)
  }

  async upsertPricing(input: Omit<MealPricing, 'id'>): Promise<MealPricing> {
    const rows = await this.db.insert(mealPricing)
      .values({
        schoolYearId: input.schoolYearId,
        mealType:     input.mealType,
        schoolCost:   String(input.schoolCost),
        parentPrice:  String(input.parentPrice),
      })
      .onConflictDoUpdate({
        target: [mealPricing.schoolYearId, mealPricing.mealType],
        set:    { schoolCost: String(input.schoolCost), parentPrice: String(input.parentPrice) },
      })
      .returning()
    return this.#mapPricing(rows[0])
  }

  async findChildren(schoolYearId: string): Promise<Child[]> {
    const rows = await this.db.select().from(children)
      .where(eq(children.schoolYearId, schoolYearId))
      .orderBy(children.fullName)
    return rows.map(this.#mapChild)
  }

  async createChild(input: Omit<Child, 'id'>): Promise<Child> {
    const rows = await this.db.insert(children).values(input).returning()
    return this.#mapChild(rows[0])
  }

  async updateChild(id: string, input: Partial<Omit<Child, 'id'>>): Promise<Child> {
    const rows = await this.db.update(children).set(input).where(eq(children.id, id)).returning()
    return this.#mapChild(rows[0])
  }

  #mapRecord = (r: typeof mealRecords.$inferSelect): MealRecord => ({
    id: r.id, childId: r.childId, date: new Date(r.date),
    mealType: r.mealType, billed: r.billed, createdBy: r.createdBy, createdAt: new Date(r.createdAt),
  })

  #mapPricing = (r: typeof mealPricing.$inferSelect): MealPricing => ({
    id: r.id, schoolYearId: r.schoolYearId, mealType: r.mealType,
    schoolCost: Number(r.schoolCost), parentPrice: Number(r.parentPrice),
  })

  #mapChild = (r: typeof children.$inferSelect): Child => ({
    id: r.id, fullName: r.fullName, schoolYearId: r.schoolYearId,
    tuitionType: r.tuitionType, isActive: r.isActive,
  })
}
