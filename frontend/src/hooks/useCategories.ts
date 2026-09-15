import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import type { Category, Paginated } from '../types'

async function fetchCategories(params?: { search?: string; limit?: number; offset?: number }): Promise<Paginated<Category>> {
  const { data } = await api.get('/api/categories', { params })
  return data
}

export function useCategorySearch(search: string, limit = 20) {
  return useQuery({
    queryKey: queryKeys.categories.search(search),
    queryFn: () => fetchCategories({ search, limit }),
    staleTime: 30 * 1000,
  })
}
