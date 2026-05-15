import { parse } from 'csv-parse/sync'
import type { MealRepository } from '../../../infrastructure/repositories/MealRepository.js'
import type { ImportResultDTO } from '@document-intel/shared-types'

export interface StudentRow {
  fullName: string
  tuitionType: string
}

export interface ImportStudentsPreview {
  rows: StudentRow[]
  parseErrors: string[]
}

function norm(s: string) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim() }

function findCol(headers: string[], keywords: string[]): string | null {
  for (const h of headers) {
    if (keywords.some(kw => norm(h).includes(kw))) return h
  }
  return null
}

export function previewStudentCsv(buffer: Buffer): ImportStudentsPreview {
  const rows: StudentRow[] = []
  const parseErrors: string[] = []

  let rawRows: Record<string, string>[]
  try {
    rawRows = parse(buffer, { columns: true, skip_empty_lines: true, bom: true, trim: true })
  } catch (err) {
    return { rows: [], parseErrors: [`Failed to parse CSV: ${err instanceof Error ? err.message : err}`] }
  }

  if (!rawRows.length) return { rows: [], parseErrors: ['CSV file is empty'] }

  const headers = Object.keys(rawRows[0])
  const nameCol    = findCol(headers, ['nome', 'name', 'aluno', 'student', 'full'])
  const tuitionCol = findCol(headers, ['propina', 'tuition', 'tipo', 'type', 'plano'])

  if (!nameCol) {
    return {
      rows: [],
      parseErrors: [`Name column not found. Headers: ${headers.join(', ')}. Expected: Nome/Name/Aluno`],
    }
  }

  for (const [i, raw] of rawRows.entries()) {
    const fullName   = String(raw[nameCol] ?? '').trim()
    const tuitionType = tuitionCol ? String(raw[tuitionCol] ?? '').trim() || 'standard' : 'standard'
    if (!fullName) { parseErrors.push(`Row ${i + 2}: empty name, skipped`); continue }
    rows.push({ fullName, tuitionType })
  }

  return { rows, parseErrors }
}

export class ImportStudents {
  constructor(private readonly repo: MealRepository) {}

  async execute(rows: StudentRow[], schoolYearId: string): Promise<ImportResultDTO> {
    const result: ImportResultDTO = { imported: 0, skipped: 0, errors: [] }
    const existing = await this.repo.findChildren(schoolYearId)
    const existingNames = new Set(existing.map(c => norm(c.fullName)))

    for (const row of rows) {
      if (existingNames.has(norm(row.fullName))) {
        result.errors.push(`"${row.fullName}" already exists — skipped`)
        result.skipped++
        continue
      }
      try {
        await this.repo.createChild({ fullName: row.fullName, schoolYearId, tuitionType: row.tuitionType, isActive: true })
        result.imported++
      } catch (err) {
        result.errors.push(`"${row.fullName}": ${err instanceof Error ? err.message : err}`)
        result.skipped++
      }
    }
    return result
  }
}
