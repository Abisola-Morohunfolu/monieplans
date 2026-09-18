import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import type { CreateFixedExpenseInput, FixedExpenseTemplate, Paginated } from '../types'

async function fetchTemplates(params?: { limit?: number; offset?: number }): Promise<Paginated<FixedExpenseTemplate>> {
  const { data } = await api.get('/api/fixed-expenses/templates', { params })
  return data
}

async function fetchTemplate(id: string): Promise<FixedExpenseTemplate> {
  const { data } = await api.get(`/api/fixed-expenses/templates/${id}`)
  return data
}

export function useFixedExpenseTemplates(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: [queryKeys.fixedExpenses.templates, params] as const,
    queryFn: () => fetchTemplates(params),
  })
}

export function useFixedExpenseTemplate(id: string) {
  return useQuery({
    queryKey: queryKeys.fixedExpenses.templateDetail(id),
    queryFn: () => fetchTemplate(id),
    enabled: !!id,
  })
}

export function useCreateFixedExpenseTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateFixedExpenseInput) =>
      api.post('/api/fixed-expenses/templates', data),
    meta: { successMessage: 'Fixed expense saved' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fixedExpenses.templates })
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all })
    },
  })
}

export function useUpdateFixedExpenseTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateFixedExpenseInput> }) =>
      api.patch(`/api/fixed-expenses/templates/${id}`, data),
    meta: { successMessage: 'Fixed expense updated' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fixedExpenses.templates })
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all })
    },
  })
}

export function useDeleteFixedExpenseTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (templateId: string) =>
      api.delete(`/api/fixed-expenses/templates/${templateId}`),
    meta: { successMessage: 'Fixed expense deleted' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fixedExpenses.templates })
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all })
    },
  })
}

export function useGenerateFixedExpenseItems(budgetPeriodId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      api.post(`/api/fixed-expenses/generate-items/${budgetPeriodId}`),
    meta: { successMessage: 'Fixed expenses generated' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.summary(budgetPeriodId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.fixedExpenses.items(budgetPeriodId) })
    },
  })
}
