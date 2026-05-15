import { eq, and } from 'drizzle-orm'
import type { DB } from '../db/client.js'
import { activities, studentActivities, children } from '../db/schema.js'
import type { ActivityDTO, CreateActivityDTO } from '@document-intel/shared-types'

export class ActivityRepository {
  constructor(private readonly db: DB) {}

  async findByYear(schoolYearId: string): Promise<ActivityDTO[]> {
    const rows = await this.db.select().from(activities)
      .where(eq(activities.schoolYearId, schoolYearId))
      .orderBy(activities.name)

    return Promise.all(rows.map(async row => {
      const enrolments = await this.db
        .select({ id: children.id, fullName: children.fullName })
        .from(studentActivities)
        .innerJoin(children, eq(studentActivities.studentId, children.id))
        .where(eq(studentActivities.activityId, row.id))
      return this.#map(row, enrolments)
    }))
  }

  async create(input: CreateActivityDTO): Promise<ActivityDTO> {
    const rows = await this.db.insert(activities).values({
      schoolYearId: input.schoolYearId,
      name:         input.name,
      description:  input.description ?? null,
      schedule:     input.schedule    ?? null,
      capacity:     input.capacity    ?? null,
    }).returning()
    return this.#map(rows[0], [])
  }

  async update(id: string, input: Partial<CreateActivityDTO & { isActive: boolean }>): Promise<ActivityDTO> {
    const rows = await this.db.update(activities).set(input).where(eq(activities.id, id)).returning()
    const enrolments = await this.db
      .select({ id: children.id, fullName: children.fullName })
      .from(studentActivities)
      .innerJoin(children, eq(studentActivities.studentId, children.id))
      .where(eq(studentActivities.activityId, id))
    return this.#map(rows[0], enrolments)
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(activities).where(eq(activities.id, id))
  }

  async enrolStudent(activityId: string, studentId: string): Promise<void> {
    await this.db.insert(studentActivities)
      .values({ activityId, studentId })
      .onConflictDoNothing()
  }

  async unenrolStudent(activityId: string, studentId: string): Promise<void> {
    await this.db.delete(studentActivities)
      .where(and(
        eq(studentActivities.activityId, activityId),
        eq(studentActivities.studentId,  studentId),
      ))
  }

  #map = (
    row: typeof activities.$inferSelect,
    students: { id: string; fullName: string }[],
  ): ActivityDTO => ({
    id:           row.id,
    schoolYearId: row.schoolYearId,
    name:         row.name,
    description:  row.description,
    schedule:     row.schedule,
    capacity:     row.capacity,
    isActive:     row.isActive,
    students,
  })
}
