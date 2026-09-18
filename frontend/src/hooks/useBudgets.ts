import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import type { Budget, CreateBudgetInput, Paginated } from '../types'

async function fetchBudgets(params?: { limit?: number; offset?: number }): Promise<Paginated<Budget>> {
  const { data } = await api.get('/api/budgets', { params })
  return data
}

async function fetchActiveBudget(): Promise<Budget | null> {
  const { data } = await api.get('/api/budgets/active')
  return data
}

export function useBudgets(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['budgets', params] as const,
    queryFn: () => fetchBudgets(params),
  })
}

export function useActiveBudget() {
  return useQuery({
    queryKey: queryKeys.budgets.active,
    queryFn: fetchActiveBudget,
  })
}

export function useCreateBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateBudgetInput) => api.post('/api/budgets', data),
    meta: { successMessage: 'Budget created' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.active })
    },
  })
}
