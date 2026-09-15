import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import type { Budget, BudgetSummary, WeeklyAllocation } from '../types'

async function fetchBudget(budgetId: string): Promise<Budget> {
  const { data } = await api.get(`/api/budgets/${budgetId}`)
  return data
}

async function fetchBudgetAllocations(budgetId: string): Promise<WeeklyAllocation[]> {
  const { data } = await api.get(`/api/budgets/${budgetId}/allocations`)
  return data
}

async function fetchBudgetSummary(budgetId: string): Promise<BudgetSummary> {
  const { data } = await api.get(`/api/budgets/${budgetId}/summary`)
  return data
}

export function useBudget(budgetId: string) {
  return useQuery({
    queryKey: queryKeys.budgets.detail(budgetId),
    queryFn: () => fetchBudget(budgetId),
    enabled: !!budgetId,
  })
}

export function useBudgetAllocations(budgetId: string) {
  return useQuery({
    queryKey: queryKeys.budgets.allocations(budgetId),
    queryFn: () => fetchBudgetAllocations(budgetId),
    enabled: !!budgetId,
  })
}

export function useBudgetSummary(budgetId: string) {
  return useQuery({
    queryKey: queryKeys.budgets.summary(budgetId),
    queryFn: () => fetchBudgetSummary(budgetId),
    enabled: !!budgetId,
  })
}

export function useActivateBudget(budgetId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.post(`/api/budgets/${budgetId}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.detail(budgetId) })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.active })
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.allocations(budgetId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.summary(budgetId) })
    },
  })
}

export function useLockBudget(budgetId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.post(`/api/budgets/${budgetId}/lock`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.detail(budgetId) })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}
