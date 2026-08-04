import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import type { Expense, ExpenseParams } from '../types'

async function fetchExpenses(params?: ExpenseParams): Promise<Expense[]> {
  const { data } = await api.get('/api/expenses', { params })
  return data
}

async function fetchExpense(id: string): Promise<Expense> {
  const { data } = await api.get(`/api/expenses/${id}`)
  return data
}

export function useExpenses(params?: ExpenseParams) {
  return useQuery({
    queryKey: queryKeys.expenses.list,
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
    mutationFn: (data: Partial<Expense>) => api.post('/api/expenses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
    },
  })
}

export function useUpdateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Expense> }) =>
      api.patch(`/api/expenses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
    },
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (expenseId: string) => api.delete(`/api/expenses/${expenseId}`),

    onMutate: async (expenseId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.expenses.all })
      const previous = queryClient.getQueryData<Expense[]>(queryKeys.expenses.all)

      queryClient.setQueryData<Expense[]>(queryKeys.expenses.all, (old) =>
        old?.filter((e) => e.id !== expenseId),
      )

      return { previous }
    },

    onError: (_err, _expenseId, context) => {
      queryClient.setQueryData(queryKeys.expenses.all, context?.previous)
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
    },
  })
}
