import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import type { CreateGoalInput, Goal, Paginated } from '../types'

async function fetchGoals(params?: { limit?: number; offset?: number }): Promise<Paginated<Goal>> {
  const { data } = await api.get('/api/goals', { params })
  return data
}

async function fetchGoal(id: string): Promise<Goal> {
  const { data } = await api.get(`/api/goals/${id}`)
  return data
}

export function useGoals(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: [queryKeys.goals.all, params] as const,
    queryFn: () => fetchGoals(params),
  })
}

export function useGoal(id: string) {
  return useQuery({
    queryKey: queryKeys.goals.detail(id),
    queryFn: () => fetchGoal(id),
    enabled: !!id,
  })
}

export function useCreateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateGoalInput) => api.post('/api/goals', data),
    meta: { successMessage: 'Goal created' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    },
  })
}

export function useUpdateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Goal> }) =>
      api.patch(`/api/goals/${id}`, data),
    meta: { successMessage: 'Goal updated' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    },
  })
}

export function useDeleteGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (goalId: string) => api.delete(`/api/goals/${goalId}`),
    meta: { successMessage: 'Goal deleted' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    },
  })
}
