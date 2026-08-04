import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import type { FixedExpenseTemplate } from '../types'

async function fetchTemplates(): Promise<FixedExpenseTemplate[]> {
  const { data } = await api.get('/api/fixed-expenses/templates')
  return data
}

async function fetchTemplate(id: string): Promise<FixedExpenseTemplate> {
  const { data } = await api.get(`/api/fixed-expenses/templates/${id}`)
  return data
}

export function useFixedExpenseTemplates() {
  return useQuery({
    queryKey: queryKeys.fixedExpenses.templates,
    queryFn: fetchTemplates,
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
    mutationFn: (data: Partial<FixedExpenseTemplate>) =>
      api.post('/api/fixed-expenses/templates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fixedExpenses.templates })
    },
  })
}

export function useUpdateFixedExpenseTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FixedExpenseTemplate> }) =>
      api.patch(`/api/fixed-expenses/templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fixedExpenses.templates })
    },
  })
}

export function useDeleteFixedExpenseTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (templateId: string) =>
      api.delete(`/api/fixed-expenses/templates/${templateId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fixedExpenses.templates })
    },
  })
}
