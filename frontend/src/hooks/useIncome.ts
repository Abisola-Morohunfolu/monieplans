import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import type { CreateIncomeInput, IncomeEntry, Paginated } from '../types'

interface IncomeParams {
  budgetPeriodId?: string
  categoryId?: string
  startDate?: string
  endDate?: string
  search?: string
  limit?: number
  offset?: number
}

async function fetchIncome(params?: IncomeParams): Promise<Paginated<IncomeEntry>> {
  const { data } = await api.get('/api/income', { params })
  return data
}

export function useIncome(params?: IncomeParams) {
  return useQuery({
    queryKey: queryKeys.income.list(params),
    queryFn: () => fetchIncome(params),
  })
}

export function useCreateIncome() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateIncomeInput) => api.post('/api/income', data),
    meta: { successMessage: 'Income added' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income'] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}

export function useUpdateIncome() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateIncomeInput> }) =>
      api.patch(`/api/income/${id}`, data),
    meta: { successMessage: 'Income updated' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income'] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}

export function useDeleteIncome() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/income/${id}`),
    meta: { successMessage: 'Income deleted' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income'] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}
