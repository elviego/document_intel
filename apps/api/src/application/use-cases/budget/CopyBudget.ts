import type { ISchoolYearRepository } from './ISchoolYearRepository'
import type { IBudgetRepository } from './IBudgetRepository'
import { NotFoundError } from '../../../shared/errors'

export class CopyBudget {
  constructor(
    private readonly schoolYears: ISchoolYearRepository,
    private readonly budget: IBudgetRepository,
  ) {}

  async execute(fromYearId: string, toYearId: string): Promise<number> {
    const [from, to] = await Promise.all([
      this.schoolYears.findById(fromYearId),
      this.schoolYears.findById(toYearId),
    ])
    if (!from) throw new NotFoundError('Source school year')
    if (!to)   throw new NotFoundError('Target school year')

    const entries = await this.budget.findByYear(fromYearId)

    await this.budget.bulkUpsert(
      entries.map(e => ({
        schoolYearId: toYearId,
        categoryId:   e.categoryId,
        month:        e.month,
        plannedAmount: e.plannedAmount,
      })),
    )

    return entries.length
  }
}
