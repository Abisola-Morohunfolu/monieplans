import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import type { AnalyticsRecommendation } from '../types'

async function fetchRecommendations(): Promise<AnalyticsRecommendation[]> {
  const { data } = await api.get('/api/analytics/recommendations')
  return data
}

export function useRecommendations() {
  return useQuery({
    queryKey: queryKeys.analytics.recommendations,
    queryFn: fetchRecommendations,
  })
}

export function useUpdateRecommendationStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'dismissed' | 'accepted' }) =>
      api.patch(`/api/analytics/recommendations/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.recommendations })
    },
  })
}

export function useGenerateInsights() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (budgetPeriodId: string) =>
      api.post('/api/analytics/generate-insights', { budgetPeriodId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all })
    },
  })
}
