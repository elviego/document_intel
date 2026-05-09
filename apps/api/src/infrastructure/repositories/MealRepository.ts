import { eq, and, gte, lte, isNull, or } from 'drizzle-orm'
import type { DB } from '../db/client.js'
import { mealRecords, mealPricing, children, mealTypes, childMealPlans } from '../db/schema.js'
import type { IMealRepository } from '../../domain/repositories/IMealRepository.js'
import type { MealRecord, MealPricing, Child } from '../../domain/entities/MealRecord.js'
import type { MealTypeDTO, ChildMealPlanDTO } from '@fin-tribe/shared-types'

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

  // ── Meal Types ─────────────────────────────────────────────────────────────────────────────────
  async findMealTypes(): Promise<MealTypeDTO[]> {
    const rows = await this.db.select().from(mealTypes).orderBy(mealTypes.name)
    return rows.map(this.#mapMealType)
  }

  async createMealType(input: { name: string; description?: string; mealsPerWeek: number; parentPrice: number; schoolCost: number }): Promise<MealTypeDTO> {
    const rows = await this.db.insert(mealTypes).values({
      name:         input.name,
      description:  input.description ?? null,
      mealsPerWeek: input.mealsPerWeek,
      parentPrice:  String(input.parentPrice),
      schoolCost:   String(input.schoolCost),
    }).returning()
    return this.#mapMealType(rows[0])
  }

  async updateMealType(id: string, input: Partial<{ name: string; description: string; mealsPerWeek: number; parentPrice: number; schoolCost: number; isActive: boolean }>): Promise<MealTypeDTO> {
    const patch: Record<string, unknown> = { ...input }
    if (input.parentPrice !== undefined) patch.parentPrice = String(input.parentPrice)
    if (input.schoolCost  !== undefined) patch.schoolCost  = String(input.schoolCost)
    const rows = await this.db.update(mealTypes).set(patch).where(eq(mealTypes.id, id)).returning()
    return this.#mapMealType(rows[0])
  }

  async deleteMealType(id: string): Promise<void> {
    await this.db.delete(mealTypes).where(eq(mealTypes.id, id))
  }

  // ── Child Meal Plans ──────────────────────────────────────────────────────────────────────────────
  async findChildMealPlans(childId: string): Promise<ChildMealPlanDTO[]> {
    const rows = await this.db
      .select({
        id:           childMealPlans.id,
        childId:      childMealPlans.childId,
        mealTypeId:   childMealPlans.mealTypeId,
        mealTypeName: mealTypes.name,
        startDate:    childMealPlans.startDate,
        endDate:      childMealPlans.endDate,
      })
      .from(childMealPlans)
      .innerJoin(mealTypes, eq(childMealPlans.mealTypeId, mealTypes.id))
      .where(eq(childMealPlans.childId, childId))
      .orderBy(childMealPlans.startDate)
    return rows.map(r => ({
      id: r.id, childId: r.childId,
      mealTypeId: r.mealTypeId, mealTypeName: r.mealTypeName,
      startDate: r.startDate, endDate: r.endDate,
    }))
  }

  async findCurrentMealPlan(childId: string): Promise<ChildMealPlanDTO | null> {
    const today = new Date().toISOString().slice(0, 10)
    const rows = await this.db
      .select({
        id: childMealPlans.id, childId: childMealPlans.childId,
        mealTypeId: childMealPlans.mealTypeId, mealTypeName: mealTypes.name,
        startDate: childMealPlans.startDate, endDate: childMealPlans.endDate,
      })
      .from(childMealPlans)
      .innerJoin(mealTypes, eq(childMealPlans.mealTypeId, mealTypes.id))
      .where(and(
        eq(childMealPlans.childId, childId),
        lte(childMealPlans.startDate, today),
        or(isNull(childMealPlans.endDate), gte(childMealPlans.endDate, today)),
      ))
      .limit(1)
    if (!rows[0]) return null
    const r = rows[0]
    return { id: r.id, childId: r.childId, mealTypeId: r.mealTypeId, mealTypeName: r.mealTypeName, startDate: r.startDate, endDate: r.endDate }
  }

  async assignMealPlan(input: { childId: string; mealTypeId: string; startDate: string; endDate?: string }): Promise<ChildMealPlanDTO> {
    const rows = await this.db.insert(childMealPlans).values({
      childId:    input.childId,
      mealTypeId: input.mealTypeId,
      startDate:  input.startDate,
      endDate:    input.endDate ?? null,
    }).returning()
    const plan = rows[0]
    const mt = await this.db.select().from(mealTypes).where(eq(mealTypes.id, plan.mealTypeId)).limit(1)
    return { id: plan.id, childId: plan.childId, mealTypeId: plan.mealTypeId, mealTypeName: mt[0]?.name ?? '', startDate: plan.startDate, endDate: plan.endDate }
  }

  async updateMealPlanEnd(id: string, endDate: string | null): Promise<ChildMealPlanDTO> {
    const rows = await this.db.update(childMealPlans).set({ endDate }).where(eq(childMealPlans.id, id)).returning()
    const plan = rows[0]
    const mt = await this.db.select().from(mealTypes).where(eq(mealTypes.id, plan.mealTypeId)).limit(1)
    return { id: plan.id, childId: plan.childId, mealTypeId: plan.mealTypeId, mealTypeName: mt[0]?.name ?? '', startDate: plan.startDate, endDate: plan.endDate }
  }

  // ── Records V2 (with meal_type_id) ────────────────────────────────────────────────────────────────────────────
  async createRecordV2(input: { childId: string; date: Date; mealTypeId: string; createdBy: string }): Promise<MealRecord> {
    const rows = await this.db.insert(mealRecords).values({
      childId:    input.childId,
      date:       input.date.toISOString().slice(0, 10),
      mealType:   'com_sopa',
      mealTypeId: input.mealTypeId,
      billed:     false,
      createdBy:  input.createdBy,
    }).returning()
    return this.#mapRecord(rows[0])
  }

  async populateMonth(schoolYearId: string, year: number, month: number, createdBy: string): Promise<number> {
    const childList = await this.findChildren(schoolYearId)
    const firstDay  = new Date(year, month - 1, 1)
    const lastDay   = new Date(year, month, 0)
    let count = 0

    for (const child of childList) {
      if (!child.isActive) continue
      const plan = await this.findCurrentMealPlan(child.id)
      if (!plan) continue

      const mt = await this.db.select().from(mealTypes).where(eq(mealTypes.id, plan.mealTypeId)).limit(1)
      if (!mt[0]) continue

      const existing = await this.findRecords(child.id, firstDay, lastDay)
      const existingDates = new Set(existing.map(r => r.date.toISOString().slice(0, 10)))

      const mealsPerWeek = mt[0].mealsPerWeek
      const workingDays: string[] = []
      const d = new Date(firstDay)
      while (d <= lastDay) {
        const dow = d.getDay()
        if (dow !== 0 && dow !== 6) workingDays.push(d.toISOString().slice(0, 10))
        d.setDate(d.getDate() + 1)
      }

      const daysToRecord: string[] = []
      const byWeek: Record<number, string[]> = {}
      for (const day of workingDays) {
        const w = Math.floor((new Date(day).getDate() - 1) / 7)
        ;(byWeek[w] ??= []).push(day)
      }
      for (const weekDays of Object.values(byWeek)) {
        daysToRecord.push(...weekDays.slice(0, mealsPerWeek))
      }

      for (const dateStr of daysToRecord) {
        if (!existingDates.has(dateStr)) {
          await this.db.insert(mealRecords).values({
            childId:    child.id,
            date:       dateStr,
            mealType:   'com_sopa',
            mealTypeId: plan.mealTypeId,
            billed:     false,
            createdBy,
          })
          count++
        }
      }
    }
    return count
  }

  #mapMealType = (r: typeof mealTypes.$inferSelect): MealTypeDTO => ({
    id:           r.id,
    name:         r.name,
    description:  r.description,
    mealsPerWeek: r.mealsPerWeek,
    parentPrice:  parseFloat(r.parentPrice ?? '0'),
    schoolCost:   parseFloat(r.schoolCost  ?? '0'),
    isActive:     r.isActive,
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
