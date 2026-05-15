import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { SchoolYearDTO } from '@document-intel/shared-types'

export function useSchoolYears() {
  return useQuery({
    queryKey: ['school-years'],
    queryFn: () => apiClient.get<SchoolYearDTO[]>('/v1/school-years'),
  })
}

/** Resolves current school year (Sep–Aug cycle) */
export function currentSchoolYearName(): string {
  const now = new Date()
  const m   = now.getMonth() + 1
  const y   = now.getFullYear()
  return m >= 9
    ? `${y}-${String(y + 1).slice(2)}`
    : `${y - 1}-${String(y).slice(2)}`
}
