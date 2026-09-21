import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import type { Category, CreateCategoryInput, Paginated } from '../types'

async function fetchCategories(params?: {
  search?: string
  limit?: number
  offset?: number
}): Promise<Paginated<Category>> {
  const { data } = await api.get('/api/categories', { params })
  return data
}

export function useCategories(params?: {
  search?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: () => fetchCategories(params),
    staleTime: 30 * 1000,
  })
}

export function useCategorySearch(search: string, limit = 25) {
  return useQuery({
    queryKey: queryKeys.categories.search(search),
    queryFn: () => fetchCategories({ search, limit }),
    staleTime: 30 * 1000,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateCategoryInput) => api.post('/api/categories', data),
    meta: { successMessage: 'Category created' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
    },
  })
}
