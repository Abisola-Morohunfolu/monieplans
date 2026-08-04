import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import type { Budget } from '../types'

async function fetchBudgets(): Promise<Budget[]> {
  const { data } = await api.get('/api/budgets')
  return data
}

async function fetchActiveBudget(): Promise<Budget | null> {
  const { data } = await api.get('/api/budgets/active')
  return data
}

export function useBudgets() {
  return useQuery({
    queryKey: queryKeys.budgets.all,
    queryFn: fetchBudgets,
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
    mutationFn: (data: Partial<Budget>) => api.post('/api/budgets', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all })
    },
  })
}
