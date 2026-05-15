import { eq } from 'drizzle-orm'
import type { DB } from '../db/client.js'
import { employees } from '../db/schema.js'
import type { EmployeeDTO, CreateEmployeeDTO } from '@document-intel/shared-types'

export class EmployeeRepository {
  constructor(private readonly db: DB) {}

  async findAll(includeInactive = false): Promise<EmployeeDTO[]> {
    const rows = await this.db.select().from(employees)
      .orderBy(employees.fullName)
    return (includeInactive ? rows : rows.filter(r => r.isActive)).map(this.#map)
  }

  async findById(id: string): Promise<EmployeeDTO | null> {
    const rows = await this.db.select().from(employees).where(eq(employees.id, id)).limit(1)
    return rows[0] ? this.#map(rows[0]) : null
  }

  async create(input: CreateEmployeeDTO): Promise<EmployeeDTO> {
    const rows = await this.db.insert(employees).values({
      fullName:     input.fullName,
      position:     input.position,
      contractType: input.contractType,
      email:        input.email ?? null,
      phone:        input.phone ?? null,
      nif:          input.nif ?? null,
      iban:         input.iban ?? null,
      baseSalary:   String(input.baseSalary),
      startDate:    input.startDate ?? null,
      endDate:      input.endDate ?? null,
      notes:        input.notes ?? null,
    }).returning()
    return this.#map(rows[0])
  }

  async update(id: string, input: Partial<CreateEmployeeDTO & { isActive: boolean }>): Promise<EmployeeDTO> {
    const set: Record<string, unknown> = { ...input }
    if (input.baseSalary !== undefined) set.baseSalary = String(input.baseSalary)
    const rows = await this.db.update(employees).set(set).where(eq(employees.id, id)).returning()
    return this.#map(rows[0])
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(employees).where(eq(employees.id, id))
  }

  #map = (row: typeof employees.$inferSelect): EmployeeDTO => ({
    id:           row.id,
    fullName:     row.fullName,
    position:     row.position,
    contractType: row.contractType,
    email:        row.email,
    phone:        row.phone,
    nif:          row.nif,
    iban:         row.iban,
    baseSalary:   Number(row.baseSalary),
    startDate:    row.startDate,
    endDate:      row.endDate,
    isActive:     row.isActive,
    notes:        row.notes,
  })
}
