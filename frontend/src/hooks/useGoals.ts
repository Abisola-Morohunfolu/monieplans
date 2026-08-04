import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import type { Goal } from '../types'

async function fetchGoals(): Promise<Goal[]> {
  const { data } = await api.get('/api/goals')
  return data
}

async function fetchGoal(id: string): Promise<Goal> {
  const { data } = await api.get(`/api/goals/${id}`)
  return data
}

export function useGoals() {
  return useQuery({
    queryKey: queryKeys.goals.all,
    queryFn: fetchGoals,
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
    mutationFn: (data: Partial<Goal>) => api.post('/api/goals', data),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    },
  })
}

export function useDeleteGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (goalId: string) => api.delete(`/api/goals/${goalId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    },
  })
}
