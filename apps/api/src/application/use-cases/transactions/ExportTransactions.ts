import { stringify } from 'csv-stringify/sync'
import type { ITransactionRepository, TransactionFilters } from '../../../domain/repositories/ITransactionRepository.js'
import { monthLabel } from '../../../domain/entities/SchoolYear.js'

export class ExportTransactions {
  constructor(private readonly transactions: ITransactionRepository) {}

  async execute(filters: TransactionFilters): Promise<string> {
    const rows = await this.transactions.findAll(filters)

    return stringify(
      rows.map(t => ({
        Data: t.date.toISOString().slice(0, 10),
        Mês: t.monthLabel,
        Tipo: t.categoryName ?? '',
        Valor: formatEuro(t.amount),
        Descrição: t.description,
        CONTA: t.bankAccountName ?? '',
      })),
      { header: true, delimiter: ',' },
    )
  }
}

function formatEuro(amount: number): string {
  return amount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
}
