import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'

interface MeResponse {
  preferredCurrency?: string
}

async function fetchPreferredCurrency(): Promise<string> {
  const { data } = await api.get<MeResponse>('/api/users/me')
  return data.preferredCurrency ?? 'NGN'
}

export function usePreferredCurrency(): string {
  const { data } = useQuery({
    queryKey: queryKeys.user.me,
    queryFn: fetchPreferredCurrency,
    staleTime: Infinity,
  })
  return data ?? 'NGN'
}
