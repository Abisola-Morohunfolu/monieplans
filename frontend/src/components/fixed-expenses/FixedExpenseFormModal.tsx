import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { FormField } from '../ui/FormField'
import { Button } from '../ui/Button'
import { CategorySelect } from '../ui/CategorySelect'
import {
  useCreateFixedExpenseTemplate,
  useUpdateFixedExpenseTemplate,
} from '../../hooks/useFixedExpenses'
import type { FixedExpenseTemplate } from '../../types'

interface FixedExpenseFormModalProps {
  open: boolean
  onClose: () => void
  template?: FixedExpenseTemplate | null
}

export function FixedExpenseFormModal({ open, onClose, template }: FixedExpenseFormModalProps) {
  const createTemplate = useCreateFixedExpenseTemplate()
  const updateTemplate = useUpdateFixedExpenseTemplate()

  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [dueDay, setDueDay] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setName(template?.name ?? '')
    setAmount(template ? String(template.amount) : '')
    setCategoryId(template?.categoryId ?? null)
    setDueDay(template?.dueDay ? String(template.dueDay) : '')
    setError('')
  }, [open, template])

  const isPending = createTemplate.isPending || updateTemplate.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Enter a name.')
      return
    }
    const numericAmount = Number(amount)
    if (!numericAmount || numericAmount < 0) {
      setError('Enter a valid amount.')
      return
    }
    setError('')

    const payload = {
      name,
      amount: numericAmount,
      categoryId: categoryId ?? undefined,
      defaultDueDay: dueDay ? Number(dueDay) : undefined,
      cadence: 'every_period' as const,
    }

    if (template) {
      await updateTemplate.mutateAsync({ id: template.id, data: payload })
    } else {
      await createTemplate.mutateAsync(payload)
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={template ? 'Edit fixed expense' : 'Add fixed expense'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rent, Netflix, Electricity"
            className="w-full py-2.5 px-3 rounded-xl border border-text-primary/12 bg-bg-lightest/60 text-sm outline-none focus:border-text-primary/20"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Amount">
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full py-2.5 px-3 rounded-xl border border-text-primary/12 bg-bg-lightest/60 text-sm outline-none focus:border-text-primary/20"
            />
          </FormField>
          <FormField label="Due day (optional)">
            <input
              type="number"
              min={1}
              max={31}
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              placeholder="1–31"
              className="w-full py-2.5 px-3 rounded-xl border border-text-primary/12 bg-bg-lightest/60 text-sm outline-none focus:border-text-primary/20"
            />
          </FormField>
        </div>

        <FormField label="Category">
          <CategorySelect value={categoryId} onChange={setCategoryId} />
        </FormField>

        {error && <p className="text-sm text-rust">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <Button type="submit" loading={isPending}>
            {template ? 'Save changes' : 'Add fixed expense'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
