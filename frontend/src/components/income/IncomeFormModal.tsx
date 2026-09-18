import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { FormField } from '../ui/FormField'
import { Button } from '../ui/Button'
import { CategorySelect } from '../ui/CategorySelect'
import { useCreateIncome, useUpdateIncome } from '../../hooks/useIncome'
import type { IncomeEntry } from '../../types'

interface IncomeFormModalProps {
  open: boolean
  onClose: () => void
  budgetPeriodId?: string
  income?: IncomeEntry | null
}

function todayInput(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function IncomeFormModal({ open, onClose, budgetPeriodId, income }: IncomeFormModalProps) {
  const createIncome = useCreateIncome()
  const updateIncome = useUpdateIncome()

  const [amount, setAmount] = useState('')
  const [incomeDate, setIncomeDate] = useState(todayInput())
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setAmount(income ? String(income.amount ?? '') : '')
    setIncomeDate(income?.incomeDate ?? income?.date ?? todayInput())
    setCategoryId(income?.categoryId ?? null)
    setDescription(income?.description ?? '')
    setError('')
  }, [open, income])

  const isPending = createIncome.isPending || updateIncome.isPending

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
      incomeDate,
      budgetPeriodId: budgetPeriodId || undefined,
      categoryId: categoryId ?? undefined,
      description: description || undefined,
    }

    if (income) {
      await updateIncome.mutateAsync({ id: income.id, data: payload })
    } else {
      await createIncome.mutateAsync(payload)
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={income ? 'Edit income' : 'Add income'}>
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
            value={incomeDate}
            onChange={(e) => setIncomeDate(e.target.value)}
            className="w-full py-2.5 px-3 rounded-xl border border-text-primary/12 bg-bg-lightest/60 text-sm outline-none focus:border-text-primary/20"
          />
        </FormField>

        <FormField label="Description">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Salary, freelance payment"
            className="w-full py-2.5 px-3 rounded-xl border border-text-primary/12 bg-bg-lightest/60 text-sm outline-none focus:border-text-primary/20"
          />
        </FormField>

        {error && <p className="text-sm text-rust">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <Button type="submit" loading={isPending}>
            {income ? 'Save changes' : 'Add income'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
