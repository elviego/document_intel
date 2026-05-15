import type { ITransactionRepository } from '../../../domain/repositories/ITransactionRepository.js'
import type { ICategoryRepository } from '../../../domain/repositories/ICategoryRepository.js'
import type { IBankAccountRepository } from '../../../infrastructure/repositories/BankAccountRepository.js'
import type { ImportRowDTO, NewCategoryInput, ImportResultDTO } from '@document-intel/shared-types'

function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

export class ConfirmImport {
  constructor(
    private readonly transactions: ITransactionRepository,
    private readonly categories: ICategoryRepository,
    private readonly bankAccounts: IBankAccountRepository,
  ) {}

  async execute(input: {
    schoolYearId: string
    rows: ImportRowDTO[]
    newCategories: NewCategoryInput[]
    createdBy: string
  }): Promise<ImportResultDTO> {
    for (const cat of input.newCategories) {
      await this.categories.create(cat)
    }

    const [allCats, allAccounts] = await Promise.all([
      this.categories.findAll(true),
      this.bankAccounts.findAll(true),
    ])
    const catMap     = new Map(allCats.map(c => [norm(c.namePt), c.id]))
    const accountMap = new Map(allAccounts.map(a => [norm(a.name), a.id]))

    const result: ImportResultDTO = { imported: 0, skipped: 0, errors: [] }

    for (const row of input.rows) {
      const catId     = catMap.get(norm(row.categoryName))
      const accountId = accountMap.get(norm(row.bankAccountName))

      if (!catId) {
        result.errors.push(`Row ${row.rowIndex + 2}: unknown category "${row.categoryName}"`)
        result.skipped++
        continue
      }
      if (!accountId) {
        result.errors.push(`Row ${row.rowIndex + 2}: unknown account "${row.bankAccountName}"`)
        result.skipped++
        continue
      }

      try {
        await this.transactions.create({
          schoolYearId:  input.schoolYearId,
          categoryId:    catId,
          bankAccountId: accountId,
          date:          new Date(row.date),
          amount:        row.amount,
          description:   row.description,
          createdBy:     input.createdBy,
        })
        result.imported++
      } catch (err) {
        result.errors.push(`Row ${row.rowIndex + 2}: ${err instanceof Error ? err.message : String(err)}`)
        result.skipped++
      }
    }

    return result
  }
}
