import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { FormField } from '../ui/FormField'
import { Button } from '../ui/Button'
import { CategorySelect } from '../ui/CategorySelect'
import { useCreateTransaction, useUpdateTransaction } from '../../hooks/useTransactions'
import type { Transaction, TransactionType } from '../../types'

interface TransactionFormModalProps {
  open: boolean
  onClose: () => void
  transaction?: Transaction | null
  defaultType?: TransactionType
  defaultDate?: string
}

function todayInput(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function TransactionFormModal({
  open,
  onClose,
  transaction,
  defaultType = 'expense',
  defaultDate,
}: TransactionFormModalProps) {
  const createTransaction = useCreateTransaction()
  const updateTransaction = useUpdateTransaction()

  const [type, setType] = useState<TransactionType>(defaultType)
  const [amount, setAmount] = useState('')
  const [occurredOn, setOccurredOn] = useState(todayInput())
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [payee, setPayee] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setType(transaction?.type ?? defaultType)
    setAmount(transaction ? String(transaction.amount ?? '') : '')
    setOccurredOn(transaction?.occurredOn ?? defaultDate ?? todayInput())
    setCategoryId(transaction?.categoryId ?? null)
    setPayee(transaction?.payee ?? '')
    setNote(transaction?.note ?? '')
    setError('')
  }, [open, transaction, defaultType, defaultDate])

  const isPending = createTransaction.isPending || updateTransaction.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numericAmount = Number(amount)
    if (!numericAmount || numericAmount <= 0) {
      setError('Enter an amount greater than 0.')
      return
    }
    setError('')

    const payload = {
      type,
      amount: numericAmount,
      occurredOn,
      categoryId: categoryId ?? undefined,
      payee: payee || undefined,
      note: note || undefined,
    }

    if (transaction) {
      await updateTransaction.mutateAsync({ id: transaction.id, data: payload })
    } else {
      await createTransaction.mutateAsync(payload)
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={transaction ? 'Edit transaction' : 'Log transaction'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-text-primary/5">
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t)
                setCategoryId(null)
              }}
              className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                type === t ? 'bg-bg-lightest text-forest shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t === 'expense' ? 'Expense' : 'Income'}
            </button>
          ))}
        </div>

        <FormField label="Amount">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            autoFocus
            className="w-full py-3 px-4 rounded-xl border border-text-primary/12 bg-bg-lightest/60 text-lg font-medium outline-none focus:border-text-primary/20"
          />
        </FormField>

        <FormField label="Category">
          <CategorySelect value={categoryId} onChange={setCategoryId} kind={type} />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Date">
            <input
              type="date"
              value={occurredOn}
              onChange={(e) => setOccurredOn(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl border border-text-primary/12 bg-bg-lightest/60 text-sm outline-none focus:border-text-primary/20"
            />
          </FormField>
          <FormField label="Payee (optional)">
            <input
              type="text"
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
              placeholder="Store or person"
              className="w-full py-2.5 px-3 rounded-xl border border-text-primary/12 bg-bg-lightest/60 text-sm outline-none focus:border-text-primary/20"
            />
          </FormField>
        </div>

        <FormField label="Note (optional)">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note"
            className="w-full py-2.5 px-3 rounded-xl border border-text-primary/12 bg-bg-lightest/60 text-sm outline-none focus:border-text-primary/20"
          />
        </FormField>

        {error && <p className="text-sm text-rust">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <Button type="submit" loading={isPending}>
            {transaction ? 'Save changes' : type === 'income' ? 'Log income' : 'Log expense'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
