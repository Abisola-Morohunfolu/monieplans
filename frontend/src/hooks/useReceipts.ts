import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import type { Receipt, ReceiptLineItem } from '../types'

async function fetchReceiptItems(receiptId: string): Promise<ReceiptLineItem[]> {
  const { data } = await api.get(`/api/expenses/receipts/${receiptId}/items`)
  return data
}

export function useReceiptItems(receiptId: string) {
  return useQuery({
    queryKey: queryKeys.receipts.items(receiptId),
    queryFn: () => fetchReceiptItems(receiptId),
    enabled: !!receiptId,
  })
}

export function useUploadReceipt() {
  return useMutation({
    mutationFn: ({ file, receiptType }: { file: File; receiptType?: string }) => {
      const formData = new FormData()
      formData.append('file', file)
      if (receiptType) formData.append('receiptType', receiptType)
      return api.post<Receipt>('/api/expenses/receipts/upload', formData)
    },
    meta: { successMessage: 'Receipt uploaded' },
  })
}

export function useConfirmReceiptItems(receiptId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (itemIds: string[]) =>
      api.post(`/api/expenses/receipts/${receiptId}/confirm-items`, { itemIds }),
    meta: { successMessage: 'Items confirmed' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.receipts.items(receiptId) })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}

export function useDismissReceiptItem(receiptId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (itemId: string) =>
      api.post(`/api/expenses/receipts/${receiptId}/dismiss-item/${itemId}`),
    meta: { successMessage: 'Item dismissed' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.receipts.items(receiptId) })
    },
  })
}
