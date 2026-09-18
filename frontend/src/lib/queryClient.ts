import { MutationCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getErrorMessage, isUnauthorized } from './errors'

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error) => {
      if (isUnauthorized(error)) return
      toast.error(getErrorMessage(error))
    },
    onSuccess: (_data, _variables, _context, mutation) => {
      const message = mutation.meta?.successMessage
      if (message) toast.success(message)
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
