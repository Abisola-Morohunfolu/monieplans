import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import type { CreateExpenseInput, Expense, ExpenseParams, Paginated } from '../types'

async function fetchExpenses(params?: ExpenseParams): Promise<Paginated<Expense>> {
  const { data } = await api.get('/api/expenses', { params })
  return data
}

async function fetchExpense(id: string): Promise<Expense> {
  const { data } = await api.get(`/api/expenses/${id}`)
  return data
}

export function useExpenses(params?: ExpenseParams) {
  return useQuery({
    queryKey: queryKeys.expenses.list(params),
    queryFn: () => fetchExpenses(params),
  })
}

export function useExpense(id: string) {
  return useQuery({
    queryKey: queryKeys.expenses.detail(id),
    queryFn: () => fetchExpense(id),
    enabled: !!id,
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateExpenseInput) => api.post('/api/expenses', data),
    meta: { successMessage: 'Expense added' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.active })
    },
  })
}

export function useUpdateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateExpenseInput> }) =>
      api.patch(`/api/expenses/${id}`, data),
    meta: { successMessage: 'Expense updated' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.active })
    },
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (expenseId: string) => api.delete(`/api/expenses/${expenseId}`),
    meta: { successMessage: 'Expense deleted' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.active })
    },
  })
}
