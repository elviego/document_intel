import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { BankAccount } from '@fin-tribe/shared-types'

export function useBankAccounts() {
  return useQuery({
    queryKey: ['bank-accounts'],
    queryFn:  () => apiClient.get<BankAccount[]>('/v1/bank-accounts'),
  })
}
