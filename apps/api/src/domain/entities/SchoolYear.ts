export type SchoolYearId = string

export interface SchoolYear {
  id: SchoolYearId
  name: string       // e.g. "2025-26"
  startDate: Date    // Sep 1
  endDate: Date      // Aug 31
  createdAt: Date
}

/** Returns the school year label for a given date (year starts in September) */
export function resolveSchoolYear(date: Date): string {
  const m = date.getMonth() + 1 // 1-based
  const y = date.getFullYear()
  return m >= 9
    ? `${y}-${String(y + 1).slice(2)}`
    : `${y - 1}-${String(y).slice(2)}`
}

/** Returns the month label used in the ledger, e.g. "set.25" */
export function monthLabel(date: Date): string {
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
  return `${months[date.getMonth()]}.${String(date.getFullYear()).slice(2)}`
}
