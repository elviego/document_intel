import { eq, and } from 'drizzle-orm'
import type { DB } from '../db/client.js'
import { children, enrollmentPlans } from '../db/schema.js'
import type { StudentDTO, CreateStudentDTO, EnrollmentPlanDTO } from '@fin-tribe/shared-types'

type Row = typeof children.$inferSelect
type PlanRow = typeof enrollmentPlans.$inferSelect

export class StudentRepository {
  constructor(private readonly db: DB) {}

  async findByYear(schoolYearId: string, includeInactive = false): Promise<StudentDTO[]> {
    const rows = await this.db.select().from(children)
      .where(includeInactive
        ? eq(children.schoolYearId, schoolYearId)
        : and(eq(children.schoolYearId, schoolYearId), eq(children.isActive, true)))
      .orderBy(children.fullName)

    const planIds = [...new Set(rows.map(r => r.planId).filter(Boolean))] as string[]
    const planMap = new Map<string, PlanRow>()
    if (planIds.length > 0) {
      const planRows = await this.db.select().from(enrollmentPlans)
      planRows.forEach(p => planMap.set(p.id, p))
    }

    return rows.map(r => this.#map(r, r.planId ? planMap.get(r.planId) ?? null : null))
  }

  async findById(id: string): Promise<StudentDTO | null> {
    const rows = await this.db.select().from(children).where(eq(children.id, id)).limit(1)
    if (!rows[0]) return null
    const plan = rows[0].planId
      ? (await this.db.select().from(enrollmentPlans).where(eq(enrollmentPlans.id, rows[0].planId)).limit(1))[0] ?? null
      : null
    return this.#map(rows[0], plan)
  }

  async create(input: CreateStudentDTO): Promise<StudentDTO> {
    const rows = await this.db.insert(children).values({
      fullName:         input.fullName,
      schoolYearId:     input.schoolYearId,
      tuitionType:      input.tuitionType,
      isActive:         true,
      firstName:        input.firstName        ?? null,
      lastName:         input.lastName         ?? null,
      birthDate:        input.birthDate        ?? null,
      nationality:      input.nationality      ?? 'Portuguesa',
      nif:              input.nif              ?? null,
      address:          input.address          ?? null,
      bloodType:        input.bloodType        ?? null,
      allergies:        input.allergies        ?? null,
      medicalNotes:     input.medicalNotes     ?? null,
      photoConsent:     input.photoConsent     ?? false,
      enrollmentDate:   input.enrollmentDate   ?? null,
      planId:           input.planId           ?? null,
      parent1FirstName: input.parent1FirstName ?? null,
      parent1LastName:  input.parent1LastName  ?? null,
      parent1Phone:     input.parent1Phone     ?? null,
      parent1Email:     input.parent1Email     ?? null,
      parent1Relation:  input.parent1Relation  ?? 'Mãe/Pai',
      parent2FirstName: input.parent2FirstName ?? null,
      parent2LastName:  input.parent2LastName  ?? null,
      parent2Phone:     input.parent2Phone     ?? null,
      parent2Email:     input.parent2Email     ?? null,
      parent2Relation:  input.parent2Relation  ?? null,
      emergencyContact: input.emergencyContact ?? null,
      emergencyPhone:   input.emergencyPhone   ?? null,
      notes:            input.notes            ?? null,
    }).returning()
    return this.findById(rows[0].id) as Promise<StudentDTO>
  }

  async update(id: string, input: Partial<CreateStudentDTO & { isActive: boolean }>): Promise<StudentDTO> {
    await this.db.update(children).set(input).where(eq(children.id, id))
    return this.findById(id) as Promise<StudentDTO>
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(children).where(eq(children.id, id))
  }

  #mapPlan = (p: PlanRow | null): EnrollmentPlanDTO | null => {
    if (!p) return null
    return {
      id:              p.id,
      name:            p.name,
      description:     p.description,
      scheduleType:    p.scheduleType as EnrollmentPlanDTO['scheduleType'],
      daysPerWeek:     p.daysPerWeek,
      morningsOnly:    p.morningsOnly,
      billingCycle:    p.billingCycle as EnrollmentPlanDTO['billingCycle'],
      baseAmount:      parseFloat(p.baseAmount ?? '0'),
      discountPercent: p.discountPercent != null ? parseFloat(p.discountPercent) : null,
      discountFixed:   p.discountFixed   != null ? parseFloat(p.discountFixed)   : null,
      isPreset:        p.isPreset,
      isActive:        p.isActive,
    }
  }

  #map = (r: Row, plan: PlanRow | null): StudentDTO => ({
    id:               r.id,
    fullName:         r.fullName,
    schoolYearId:     r.schoolYearId,
    tuitionType:      r.tuitionType,
    isActive:         r.isActive,
    firstName:        r.firstName,
    lastName:         r.lastName,
    birthDate:        r.birthDate,
    nationality:      r.nationality,
    nif:              r.nif,
    address:          r.address,
    bloodType:        r.bloodType,
    allergies:        r.allergies,
    medicalNotes:     r.medicalNotes,
    photoConsent:     r.photoConsent,
    enrollmentDate:   r.enrollmentDate,
    plan:             this.#mapPlan(plan),
    parent1FirstName: r.parent1FirstName,
    parent1LastName:  r.parent1LastName,
    parent1Phone:     r.parent1Phone,
    parent1Email:     r.parent1Email,
    parent1Relation:  r.parent1Relation,
    parent2FirstName: r.parent2FirstName,
    parent2LastName:  r.parent2LastName,
    parent2Phone:     r.parent2Phone,
    parent2Email:     r.parent2Email,
    parent2Relation:  r.parent2Relation,
    emergencyContact: r.emergencyContact,
    emergencyPhone:   r.emergencyPhone,
    notes:            r.notes,
  })
}
