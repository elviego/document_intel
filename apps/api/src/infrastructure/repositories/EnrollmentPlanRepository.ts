import { eq } from 'drizzle-orm'
import type { DB } from '../db/client.js'
import { enrollmentPlans } from '../db/schema.js'
import type { EnrollmentPlanDTO, CreateEnrollmentPlanDTO } from '@fin-tribe/shared-types'

export class EnrollmentPlanRepository {
  constructor(private readonly db: DB) {}

  async findAll(includeInactive = false): Promise<EnrollmentPlanDTO[]> {
    const rows = await this.db.select().from(enrollmentPlans).orderBy(enrollmentPlans.name)
    return rows
      .filter(r => includeInactive || r.isActive)
      .map(this.#map)
  }

  async findById(id: string): Promise<EnrollmentPlanDTO | null> {
    const rows = await this.db.select().from(enrollmentPlans).where(eq(enrollmentPlans.id, id)).limit(1)
    return rows[0] ? this.#map(rows[0]) : null
  }

  async create(input: CreateEnrollmentPlanDTO): Promise<EnrollmentPlanDTO> {
    const rows = await this.db.insert(enrollmentPlans).values({
      name:            input.name,
      description:     input.description     ?? null,
      scheduleType:    input.scheduleType,
      daysPerWeek:     input.daysPerWeek      ?? null,
      morningsOnly:    input.morningsOnly     ?? false,
      billingCycle:    input.billingCycle     ?? 'monthly',
      baseAmount:      String(input.baseAmount),
      discountPercent: input.discountPercent != null ? String(input.discountPercent) : null,
      discountFixed:   input.discountFixed   != null ? String(input.discountFixed)   : null,
    }).returning()
    return this.#map(rows[0])
  }

  async update(id: string, input: Partial<CreateEnrollmentPlanDTO & { isActive: boolean }>): Promise<EnrollmentPlanDTO> {
    const patch: Record<string, unknown> = { ...input }
    if (input.baseAmount    != null) patch.baseAmount    = String(input.baseAmount)
    if (input.discountPercent != null) patch.discountPercent = String(input.discountPercent)
    if (input.discountFixed   != null) patch.discountFixed   = String(input.discountFixed)
    const rows = await this.db.update(enrollmentPlans).set(patch).where(eq(enrollmentPlans.id, id)).returning()
    return this.#map(rows[0])
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(enrollmentPlans).where(eq(enrollmentPlans.id, id))
  }

  #map = (r: typeof enrollmentPlans.$inferSelect): EnrollmentPlanDTO => ({
    id:              r.id,
    name:            r.name,
    description:     r.description,
    scheduleType:    r.scheduleType as EnrollmentPlanDTO['scheduleType'],
    daysPerWeek:     r.daysPerWeek,
    morningsOnly:    r.morningsOnly,
    billingCycle:    r.billingCycle as EnrollmentPlanDTO['billingCycle'],
    baseAmount:      parseFloat(r.baseAmount ?? '0'),
    discountPercent: r.discountPercent != null ? parseFloat(r.discountPercent) : null,
    discountFixed:   r.discountFixed   != null ? parseFloat(r.discountFixed)   : null,
    isPreset:        r.isPreset,
    isActive:        r.isActive,
  })
}
