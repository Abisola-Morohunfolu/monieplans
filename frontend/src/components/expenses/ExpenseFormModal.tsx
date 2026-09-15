import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { FormField } from '../ui/FormField'
import { Button } from '../ui/Button'
import { CategorySelect } from '../ui/CategorySelect'
import { useCreateExpense, useUpdateExpense } from '../../hooks/useExpenses'
import type { Expense } from '../../types'

interface ExpenseFormModalProps {
  open: boolean
  onClose: () => void
  expense?: Expense | null
  defaultDate?: string
}

function todayInput(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function ExpenseFormModal({ open, onClose, expense, defaultDate }: ExpenseFormModalProps) {
  const createExpense = useCreateExpense()
  const updateExpense = useUpdateExpense()

  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(todayInput())
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [merchantName, setMerchantName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setAmount(expense ? String(expense.amount ?? '') : '')
    setExpenseDate(expense?.expenseDate ?? defaultDate ?? todayInput())
    setCategoryId(expense?.categoryId ?? null)
    setDescription(expense?.description ?? '')
    setMerchantName(expense?.merchantName ?? '')
    setError('')
  }, [open, expense, defaultDate])

  const isPending = createExpense.isPending || updateExpense.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numericAmount = Number(amount)
    if (!numericAmount || numericAmount <= 0) {
      setError('Enter an amount greater than 0.')
      return
    }
    setError('')

    const payload = {
      amount: numericAmount,
      expenseDate,
      categoryId: categoryId ?? undefined,
      description: description || undefined,
      merchantName: merchantName || undefined,
    }

    if (expense) {
      await updateExpense.mutateAsync({ id: expense.id, data: payload })
    } else {
      await createExpense.mutateAsync(payload)
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={expense ? 'Edit expense' : 'Log expense'}>
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <CategorySelect value={categoryId} onChange={setCategoryId} />
        </FormField>

        <FormField label="Date">
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className="w-full py-2.5 px-3 rounded-xl border border-text-primary/12 bg-bg-lightest/60 text-sm outline-none focus:border-text-primary/20"
          />
        </FormField>

        <FormField label="Description">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this for?"
            className="w-full py-2.5 px-3 rounded-xl border border-text-primary/12 bg-bg-lightest/60 text-sm outline-none focus:border-text-primary/20"
          />
        </FormField>

        <FormField label="Merchant (optional)">
          <input
            type="text"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            placeholder="Store or vendor name"
            className="w-full py-2.5 px-3 rounded-xl border border-text-primary/12 bg-bg-lightest/60 text-sm outline-none focus:border-text-primary/20"
          />
        </FormField>

        {error && <p className="text-sm text-rust">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <Button type="submit" loading={isPending}>
            {expense ? 'Save changes' : 'Add expense'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
