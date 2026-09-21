import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import type {
  Budget,
  BudgetSummary,
  CategoryBudget,
  SetAssignmentsInput,
} from '../types'

async function upsertBudget(month: string): Promise<Budget & { assignments: CategoryBudget[] }> {
  const { data } = await api.put(`/api/budgets/${month}`)
  return data
}

async function fetchBudgetSummary(month: string): Promise<BudgetSummary> {
  const { data } = await api.get(`/api/budgets/${month}/summary`)
  return data
}

export function useBudget(month: string) {
  return useQuery({
    queryKey: queryKeys.budgets.month(month),
    queryFn: () => upsertBudget(month),
    enabled: !!month,
  })
}

export function useBudgetSummary(month: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.budgets.summary(month),
    queryFn: () => fetchBudgetSummary(month),
    enabled: !!month && enabled,
  })
}

export function useSetAssignments(month: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SetAssignmentsInput) =>
      api.put(`/api/budgets/${month}/assignments`, data),
    meta: { successMessage: 'Budget updated' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.month(month) })
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.summary(month) })
    },
  })
}
