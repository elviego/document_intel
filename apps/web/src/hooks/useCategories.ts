import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { CategoryDTO } from '@document-intel/shared-types'

export function useCategories(includeInactive = false) {
  return useQuery({
    queryKey: ['categories', { includeInactive }],
    queryFn: () => apiClient.get<CategoryDTO[]>(`/v1/categories?includeInactive=${includeInactive}`),
  })
}
