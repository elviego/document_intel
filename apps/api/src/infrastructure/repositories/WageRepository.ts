import { eq, desc } from 'drizzle-orm'
import type { DB } from '../db/client.js'
import { wages } from '../db/schema.js'
import type { WageDTO } from '@document-intel/shared-types'
import { calculateWage } from '../../domain/services/IrsCalculator.js'

type WageInput = {
  employeeId: string
  effectiveFrom: string
  grossAmount: number
  contractType: string
  maritalStatus: string
  dependents: number
  notes?: string
}

export class WageRepository {
  constructor(private readonly db: DB) {}

  async findByEmployee(employeeId: string): Promise<WageDTO[]> {
    const rows = await this.db.select().from(wages)
      .where(eq(wages.employeeId, employeeId))
      .orderBy(desc(wages.effectiveFrom))
    return rows.map(this.#map)
  }

  async findLatest(employeeId: string): Promise<WageDTO | null> {
    const rows = await this.db.select().from(wages)
      .where(eq(wages.employeeId, employeeId))
      .orderBy(desc(wages.effectiveFrom))
      .limit(1)
    return rows[0] ? this.#map(rows[0]) : null
  }

  async create(input: WageInput): Promise<WageDTO> {
    const calc = calculateWage(input.grossAmount, input.contractType, input.maritalStatus, input.dependents)
    const rows = await this.db.insert(wages).values({
      employeeId:        input.employeeId,
      effectiveFrom:     input.effectiveFrom,
      grossAmount:       String(calc.grossAmount),
      contractType:      input.contractType,
      maritalStatus:     input.maritalStatus,
      dependents:        input.dependents,
      irsRate:           String(calc.irsRate),
      irsAmount:         String(calc.irsAmount),
      ssEmployeeRate:    String(calc.ssEmployeeRate),
      ssEmployeeAmount:  String(calc.ssEmployeeAmount),
      ssEmployerRate:    String(calc.ssEmployerRate),
      ssEmployerAmount:  String(calc.ssEmployerAmount),
      netAmount:         String(calc.netAmount),
      totalEmployerCost: String(calc.totalEmployerCost),
      notes:             input.notes ?? null,
    }).returning()
    return this.#map(rows[0])
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(wages).where(eq(wages.id, id))
  }

  #map = (r: typeof wages.$inferSelect): WageDTO => ({
    id:                r.id,
    employeeId:        r.employeeId,
    effectiveFrom:     r.effectiveFrom,
    grossAmount:       parseFloat(r.grossAmount),
    contractType:      r.contractType as WageDTO['contractType'],
    maritalStatus:     r.maritalStatus as WageDTO['maritalStatus'],
    dependents:        r.dependents,
    irsRate:           parseFloat(r.irsRate ?? '0'),
    irsAmount:         parseFloat(r.irsAmount ?? '0'),
    ssEmployeeRate:    parseFloat(r.ssEmployeeRate ?? '0'),
    ssEmployeeAmount:  parseFloat(r.ssEmployeeAmount ?? '0'),
    ssEmployerRate:    parseFloat(r.ssEmployerRate ?? '0'),
    ssEmployerAmount:  parseFloat(r.ssEmployerAmount ?? '0'),
    netAmount:         parseFloat(r.netAmount ?? '0'),
    totalEmployerCost: parseFloat(r.totalEmployerCost ?? '0'),
    notes:             r.notes,
    createdAt:         r.createdAt.toISOString(),
  })
}
