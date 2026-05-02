import { read, utils } from 'xlsx'
import type { ICategoryRepository } from '../../../domain/repositories/ICategoryRepository.js'
import type { IBankAccountRepository } from '../../../infrastructure/repositories/BankAccountRepository.js'
import type { ImportPreviewDTO, ImportRowDTO } from '@fin-tribe/shared-types'

function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

function findCol(headers: string[], keywords: string[]): string | null {
  for (const h of headers) {
    if (keywords.some(kw => norm(h).includes(kw))) return h
  }
  return null
}

function parseDate(raw: unknown): string | null {
  if (raw instanceof Date) return raw.toISOString().slice(0, 10)
  const s = String(raw ?? '').trim()
  // DD/MM/YYYY
  const pt = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (pt) return `${pt[3]}-${pt[2].padStart(2, '0')}-${pt[1].padStart(2, '0')}`
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

function parseAmount(raw: unknown): number | null {
  if (typeof raw === 'number') return raw
  const s = String(raw ?? '').trim().replace(/[€\s$]/g, '')
  // European: 1.234,56 → 1234.56
  const clean = s.includes(',')
    ? s.replace(/\./g, '').replace(',', '.')
    : s
  const n = parseFloat(clean)
  return isNaN(n) ? null : n
}

export class PreviewImport {
  constructor(
    private readonly categories: ICategoryRepository,
    private readonly bankAccounts: IBankAccountRepository,
  ) {}

  async execute(buffer: Buffer): Promise<ImportPreviewDTO> {
    const wb = read(buffer, { type: 'buffer', cellDates: true })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rawRows = utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

    if (!rawRows.length) {
      return { rows: [], unknownCategories: [], unknownAccounts: [], parseErrors: ['File is empty or has no data rows'] }
    }

    const headers = Object.keys(rawRows[0])
    const dateCol    = findCol(headers, ['data', 'date'])
    const amountCol  = findCol(headers, ['valor', 'amount', 'montante'])
    const catCol     = findCol(headers, ['tipo', 'categoria', 'category'])
    const descCol    = findCol(headers, ['descri', 'description', 'comentario', 'obs', 'notes'])
    const accountCol = findCol(headers, ['conta', 'account', 'banco'])

    if (!dateCol || !amountCol || !catCol) {
      return {
        rows: [],
        unknownCategories: [],
        unknownAccounts: [],
        parseErrors: [
          `Required columns not found (date, amount, category). ` +
          `Headers detected: ${headers.join(', ')}. ` +
          `Expected columns: Data/Date, Valor/Amount, Tipo/Categoria/Category.`,
        ],
      }
    }

    const [allCats, allAccounts] = await Promise.all([
      this.categories.findAll(true),
      this.bankAccounts.findAll(true),
    ])
    const catNames     = new Set(allCats.map(c => norm(c.namePt)))
    const accountNames = new Set(allAccounts.map(a => norm(a.name)))

    const rows: ImportRowDTO[]      = []
    const unknownCats     = new Set<string>()
    const unknownAccounts = new Set<string>()
    const parseErrors: string[]     = []

    for (const [i, raw] of rawRows.entries()) {
      const rowNum      = i + 2
      const catName     = String(raw[catCol] ?? '').trim()
      const accountName = accountCol ? String(raw[accountCol] ?? '').trim() : ''
      const desc        = descCol    ? String(raw[descCol]    ?? '').trim() : ''

      if (!catName && !raw[amountCol] && !raw[dateCol]) continue

      const date = parseDate(raw[dateCol])
      if (!date) { parseErrors.push(`Row ${rowNum}: invalid date "${raw[dateCol]}"`); continue }

      const amount = parseAmount(raw[amountCol])
      if (amount === null) { parseErrors.push(`Row ${rowNum}: invalid amount "${raw[amountCol]}"`); continue }

      if (catName && !catNames.has(norm(catName)))         unknownCats.add(catName)
      if (accountName && !accountNames.has(norm(accountName))) unknownAccounts.add(accountName)

      rows.push({ rowIndex: i, date, categoryName: catName, bankAccountName: accountName, amount, description: desc })
    }

    return {
      rows,
      unknownCategories: Array.from(unknownCats),
      unknownAccounts:   Array.from(unknownAccounts),
      parseErrors,
    }
  }
}
