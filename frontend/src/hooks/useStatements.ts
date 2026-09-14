import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import type { StatementUpload, StatementTransaction } from '../types'

async function fetchStatements(): Promise<StatementUpload[]> {
  const { data } = await api.get('/api/statements')
  return data
}

async function fetchStatement(id: string): Promise<StatementUpload> {
  const { data } = await api.get(`/api/statements/${id}`)
  return data
}

async function fetchStatementTransactions(id: string): Promise<StatementTransaction[]> {
  const { data } = await api.get(`/api/statements/${id}/transactions`)
  return data
}

export function useStatements() {
  return useQuery({
    queryKey: queryKeys.statements.all,
    queryFn: fetchStatements,
  })
}

export function useStatement(id: string) {
  return useQuery({
    queryKey: queryKeys.statements.detail(id),
    queryFn: () => fetchStatement(id),
    enabled: !!id,
  })
}

export function useStatementTransactions(id: string) {
  return useQuery({
    queryKey: queryKeys.statements.transactions(id),
    queryFn: () => fetchStatementTransactions(id),
    enabled: !!id,
  })
}

export function useConvertTransactionToExpense(statementId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (transactionId: string) =>
      api.post(`/api/statements/transactions/${transactionId}/convert-to-expense`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.statements.transactions(statementId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
    },
  })
}

export function useConvertTransactionToIncome(statementId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (transactionId: string) =>
      api.post(`/api/statements/transactions/${transactionId}/convert-to-income`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.statements.transactions(statementId) })
    },
  })
}

export function useUpdateTransactionCategory(statementId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ transactionId, categoryId }: { transactionId: string; categoryId: string | null }) =>
      api.patch(`/api/statements/transactions/${transactionId}`, { categoryId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.statements.transactions(statementId) })
    },
  })
}

export function useUploadStatement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.post('/api/statements/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.statements.all })
    },
  })
}
