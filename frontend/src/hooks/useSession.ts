import { useQuery } from '@tanstack/react-query'
import { authClient } from '../lib/auth'
import { queryKeys } from '../lib/queryKeys'

export function fetchSession() {
  return authClient.getSession().then((res) => res.data)
}

export function useSessionQuery() {
  return useQuery({
    queryKey: queryKeys.user.session,
    queryFn: fetchSession,
    staleTime: 30 * 1000,
  })
}
