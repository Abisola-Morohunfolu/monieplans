import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import type { Category } from '../types'

async function fetchCategories(): Promise<Category[]> {
  const { data } = await api.get('/api/categories')
  return data
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: fetchCategories,
    staleTime: Infinity,
  })
}
