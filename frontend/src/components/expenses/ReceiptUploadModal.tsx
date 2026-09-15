import { useRef, useState } from 'react'
import { Upload, CheckCircle, X } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useUploadReceipt, useReceiptItems, useConfirmReceiptItems, useDismissReceiptItem } from '../../hooks/useReceipts'
import type { ReceiptLineItem } from '../../types'

interface ReceiptUploadModalProps {
  open: boolean
  onClose: () => void
}

export function ReceiptUploadModal({ open, onClose }: ReceiptUploadModalProps) {
  const upload = useUploadReceipt()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')

  const { data: items, isFetching } = useReceiptItems(receiptId ?? '')
  const confirmItems = useConfirmReceiptItems(receiptId ?? '')
  const dismissItem = useDismissReceiptItem(receiptId ?? '')

  const reset = () => {
    setReceiptId(null)
    setSelected(new Set())
    setError('')
    upload.reset()
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    try {
      const result = await upload.mutateAsync({ file })
      setReceiptId(result.data.id)
    } catch {
      setError('Failed to upload receipt. Please try again.')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const confirm = async () => {
    if (selected.size === 0) return
    await confirmItems.mutateAsync(Array.from(selected))
    handleClose()
  }

  const pendingItems = (items ?? []).filter((i) => i.status === 'suggested')
  const processing = receiptId && pendingItems.length === 0 && isFetching

  return (
    <Modal open={open} onClose={handleClose} title="Scan receipt">
      {!receiptId ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-text-primary/12 rounded-2xl py-12 flex flex-col items-center justify-center cursor-pointer hover:border-sage transition-colors"
        >
          <div className="w-14 h-14 bg-sage/20 text-forest rounded-full flex items-center justify-center mb-4">
            <Upload className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-text-primary">Upload a receipt image</p>
          <p className="text-xs text-text-tertiary mt-1">We'll auto-detect line items and totals.</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      ) : processing ? (
        <div className="py-8 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-secondary mt-4">Reading receipt…</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Select the items to add as expenses.
          </p>
          {pendingItems.length === 0 ? (
            <p className="text-sm text-text-tertiary py-4 text-center">No items detected.</p>
          ) : (
            pendingItems.map((item: ReceiptLineItem) => (
              <label
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-2xl bg-text-primary/3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggle(item.id)}
                  className="accent-forest"
                />
                <span className="flex-1 text-sm text-text-primary">{item.name}</span>
                <span className="text-sm text-text-secondary">
                  {(item.totalPriceCents / 100).toLocaleString()}
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    dismissItem.mutate(item.id)
                  }}
                  className="p-1 text-text-tertiary hover:text-rust"
                  aria-label="Dismiss item"
                >
                  <X className="w-4 h-4" />
                </button>
              </label>
            ))
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={handleClose} className="btn-secondary">
              Cancel
            </button>
            <Button onClick={confirm} disabled={selected.size === 0} loading={confirmItems.isPending}>
              <CheckCircle className="w-4 h-4" /> Add selected
            </Button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-rust mt-3">{error}</p>}
    </Modal>
  )
}
