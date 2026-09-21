import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import type {
  Budget,
  BudgetSummary,
  CategoryBudget,
  SetAssignmentsInput,
} from '../types'

interface BudgetWithAssignments extends Budget {
  assignments: CategoryBudget[]
}

async function fetchBudget(
  month: string,
): Promise<BudgetWithAssignments | null> {
  try {
    const { data } = await api.get(`/api/budgets/${month}`)
    return data
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null
    throw error
  }
}

async function fetchBudgetSummary(month: string): Promise<BudgetSummary> {
  const { data } = await api.get(`/api/budgets/${month}/summary`)
  return data
}

export function useBudget(month: string) {
  return useQuery({
    queryKey: queryKeys.budgets.month(month),
    queryFn: () => fetchBudget(month),
    enabled: !!month,
  })
}

export function useActivateBudget(month: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.put(`/api/budgets/${month}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.month(month) })
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.summary(month) })
    },
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
