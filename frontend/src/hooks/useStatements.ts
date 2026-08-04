import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import type { StatementUpload, StatementTransaction } from '../types'

async function fetchStatements(): Promise<StatementUpload[]> {
  const { data } = await api.get('/api/statements')
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

export function useStatementTransactions(id: string) {
  return useQuery({
    queryKey: queryKeys.statements.transactions(id),
    queryFn: () => fetchStatementTransactions(id),
    enabled: !!id,
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
