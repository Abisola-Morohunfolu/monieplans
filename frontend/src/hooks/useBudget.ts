import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import type { Budget } from '../types'

async function fetchBudget(budgetId: string): Promise<Budget> {
  const { data } = await api.get(`/api/budgets/${budgetId}`)
  return data
}

export function useBudget(budgetId: string) {
  return useQuery({
    queryKey: queryKeys.budgets.detail(budgetId),
    queryFn: () => fetchBudget(budgetId),
    enabled: !!budgetId,
  })
}

export function useActivateBudget(budgetId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.post(`/api/budgets/${budgetId}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.detail(budgetId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.active })
    },
  })
}

export function useLockBudget(budgetId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.post(`/api/budgets/${budgetId}/lock`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.detail(budgetId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all })
    },
  })
}
