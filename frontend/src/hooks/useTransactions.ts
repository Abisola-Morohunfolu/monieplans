import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import type {
  CreateTransactionInput,
  Paginated,
  Transaction,
  TransactionListParams,
  UpdateTransactionInput,
} from '../types'

async function fetchTransactions(
  params?: TransactionListParams,
): Promise<Paginated<Transaction>> {
  const { data } = await api.get('/api/transactions', { params })
  return data
}

export function useTransactions(params?: TransactionListParams) {
  return useQuery({
    queryKey: queryKeys.transactions.list(params),
    queryFn: () => fetchTransactions(params),
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTransactionInput) =>
      api.post('/api/transactions', data),
    meta: { successMessage: 'Transaction logged' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTransactionInput }) =>
      api.patch(`/api/transactions/${id}`, data),
    meta: { successMessage: 'Transaction updated' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/transactions/${id}`),
    meta: { successMessage: 'Transaction deleted' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}
