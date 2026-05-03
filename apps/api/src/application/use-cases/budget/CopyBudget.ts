import type { ISchoolYearRepository } from '../../../infrastructure/repositories/SchoolYearRepository.js'
import type { IBudgetRepository } from '../../../infrastructure/repositories/BudgetRepository.js'
import { NotFoundError } from '../../../shared/errors.js'

export class CopyBudget {
  constructor(
    private readonly schoolYears: ISchoolYearRepository,
    private readonly budget: IBudgetRepository,
  ) {}

  async execute(fromYearId: string, toYearId: string, mode: 'planned' | 'executed' = 'planned'): Promise<number> {
    const [from, to] = await Promise.all([
      this.schoolYears.findById(fromYearId),
      this.schoolYears.findById(toYearId),
    ])
    if (!from) throw new NotFoundError('Source school year')
    if (!to)   throw new NotFoundError('Target school year')

    if (mode === 'executed') {
      const execution = await this.budget.getExecution(fromYearId)
      const rows = execution.filter(e => e.actualAmount !== 0)
      await this.budget.bulkUpsert(
        rows.map(e => ({
          schoolYearId:  toYearId,
          categoryId:    e.categoryId,
          month:         e.month,
          plannedAmount: Math.abs(e.actualAmount),
        })),
      )
      return rows.length
    }

    const entries = await this.budget.findByYear(fromYearId)
    await this.budget.bulkUpsert(
      entries.map(e => ({
        schoolYearId:  toYearId,
        categoryId:    e.categoryId,
        month:         e.month,
        plannedAmount: e.plannedAmount,
      })),
    )
    return entries.length
  }
}
