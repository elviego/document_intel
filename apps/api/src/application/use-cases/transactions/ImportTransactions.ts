import { parse } from 'csv-parse/sync'
import type { ITransactionRepository } from '../../../domain/repositories/ITransactionRepository'
import type { ICategoryRepository } from '../../../domain/repositories/ICategoryRepository'
import { monthLabel } from '../../../domain/entities/SchoolYear'
import { ValidationError } from '../../../shared/errors'

interface RawRow {
  Data: string
  Mês: string
  Tipo: string
  Valor: string
  Descrição: string
  CONTA: string
}

export class ImportTransactions {
  constructor(
    private readonly transactions: ITransactionRepository,
    private readonly categories: ICategoryRepository,
    private readonly bankAccounts: { findByName(name: string): Promise<{ id: string } | null> },
  ) {}

  async execute(csvBuffer: Buffer, schoolYearId: string, createdBy: string) {
    const rows = parse(csvBuffer, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
    }) as RawRow[]

    const allCategories = await this.categories.findAll()
    const catMap = Object.fromEntries(allCategories.map(c => [c.namePt.toLowerCase(), c]))

    const results = { imported: 0, skipped: 0, errors: [] as string[] }

    for (const [i, row] of rows.entries()) {
      try {
        if (!row.Data || !row.Tipo || !row.Valor) { results.skipped++; continue }

        const date = new Date(row.Data)
        if (isNaN(date.getTime())) { results.skipped++; continue }

        // Parse European number format: "-€1.234,56" → -1234.56
        const raw = row.Valor.replace(/[€\s.]/g, '').replace(',', '.')
        const amount = parseFloat(raw)
        if (isNaN(amount)) { results.skipped++; continue }

        const cat = catMap[row.Tipo.trim().toLowerCase()]
        if (!cat) throw new ValidationError(`Unknown category: "${row.Tipo}"`)

        const accountName = row.CONTA?.trim() ?? ''
        const account = await this.bankAccounts.findByName(accountName)
        if (!account) throw new ValidationError(`Unknown account: "${accountName}"`)

        await this.transactions.create({
          schoolYearId,
          categoryId: cat.id,
          bankAccountId: account.id,
          date,
          amount,
          description: row.Descrição ?? '',
          createdBy,
        })
        results.imported++
      } catch (err) {
        results.errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : err}`)
      }
    }

    return results
  }
}
