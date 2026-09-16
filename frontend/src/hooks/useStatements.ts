import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import type { StatementUpload, StatementTransaction, Paginated } from '../types'

async function fetchStatements(params?: { limit?: number; offset?: number }): Promise<Paginated<StatementUpload>> {
  const { data } = await api.get('/api/statements', { params })
  return data
}

async function fetchStatement(id: string): Promise<StatementUpload> {
  const { data } = await api.get(`/api/statements/${id}`)
  return data
}

async function fetchStatementTransactions(
  id: string,
  params?: { limit?: number; offset?: number },
): Promise<Paginated<StatementTransaction>> {
  const { data } = await api.get(`/api/statements/${id}/transactions`, { params })
  return data
}

async function fetchAllTransactions(params?: {
  limit?: number
  offset?: number
}): Promise<Paginated<StatementTransaction>> {
  const { data } = await api.get('/api/statements/transactions', { params })
  return data
}

export function useStatements(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: [queryKeys.statements.all, params] as const,
    queryFn: () => fetchStatements(params),
    refetchInterval: (query) => {
      const data = query.state.data
      const hasPending = data?.data.some(
        (s) => s.uploadStatus === 'uploaded' || s.uploadStatus === 'processing',
      )
      return hasPending ? 3000 : false
    },
  })
}

export function useStatement(id: string) {
  return useQuery({
    queryKey: queryKeys.statements.detail(id),
    queryFn: () => fetchStatement(id),
    enabled: !!id,
  })
}

export function useStatementTransactions(
  id: string,
  params?: { limit?: number; offset?: number },
) {
  return useQuery({
    queryKey: [queryKeys.statements.transactions(id), params] as const,
    queryFn: () => fetchStatementTransactions(id, params),
    enabled: !!id,
  })
}

export function useAllTransactions(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: queryKeys.statements.allTransactions(params),
    queryFn: () => fetchAllTransactions(params),
  })
}

export function useConvertTransactionToExpense(_statementId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ transactionId, budgetId }: { transactionId: string; budgetId: string }) =>
      api.post(`/api/statements/transactions/${transactionId}/convert-to-expense`, { budgetId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statements'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}

export function useConvertTransactionToIncome(_statementId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (transactionId: string) =>
      api.post(`/api/statements/transactions/${transactionId}/convert-to-income`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statements'] })
      queryClient.invalidateQueries({ queryKey: ['income'] })
    },
  })
}

export function useUpdateTransactionCategory(_statementId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ transactionId, categoryId }: { transactionId: string; categoryId: string | null }) =>
      api.patch(`/api/statements/transactions/${transactionId}`, { categoryId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statements'] })
    },
  })
}

export function useUploadStatement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ file, budgetPeriodId }: { file: File; budgetPeriodId?: string | null }) => {
      const formData = new FormData()
      formData.append('file', file)
      if (budgetPeriodId) formData.append('budgetPeriodId', budgetPeriodId)
      return api.post('/api/statements/upload', formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.statements.all] })
    },
  })
}
