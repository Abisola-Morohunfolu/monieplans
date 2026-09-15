import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { FormField } from '../ui/FormField'
import { Button } from '../ui/Button'
import { useCreateBudget } from '../../hooks/useBudgets'

interface BudgetFormModalProps {
  open: boolean
  onClose: () => void
}

function toDateInput(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function currentMonthRange(): { start: string; end: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { start: toDateInput(start), end: toDateInput(end) }
}

export function BudgetFormModal({ open, onClose }: BudgetFormModalProps) {
  const createBudget = useCreateBudget()
  const { start, end } = currentMonthRange()

  const [startDate, setStartDate] = useState(start)
  const [endDate, setEndDate] = useState(end)
  const [planningMode, setPlanningMode] = useState<'income_based' | 'spending_cap_based'>('income_based')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('NGN')
  const [activate, setActivate] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setAmount('')
      setError('')
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numericAmount = Number(amount)
    if (!numericAmount || numericAmount <= 0) {
      setError('Enter an amount greater than 0.')
      return
    }
    setError('')

    const payload =
      planningMode === 'income_based'
        ? { monthlyIncomeAmount: numericAmount }
        : { monthlyBudgetCapAmount: numericAmount }

    await createBudget.mutateAsync({
      periodStartDate: startDate,
      periodEndDate: endDate,
      planningMode,
      currency,
      activateImmediately: activate,
      ...payload,
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Create budget">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Start date">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl border border-text-primary/12 bg-bg-lightest/60 text-sm outline-none focus:border-text-primary/20"
            />
          </FormField>
          <FormField label="End date">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl border border-text-primary/12 bg-bg-lightest/60 text-sm outline-none focus:border-text-primary/20"
            />
          </FormField>
        </div>

        <FormField label="Planning mode">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPlanningMode('income_based')}
              className={`text-left p-3 rounded-2xl border transition-all ${
                planningMode === 'income_based' ? 'border-forest bg-sage/20' : 'border-text-primary/10 hover:bg-text-primary/5'
              }`}
            >
              <p className="text-sm font-semibold">Income based</p>
              <p className="text-xs text-text-tertiary">Plan from earnings</p>
            </button>
            <button
              type="button"
              onClick={() => setPlanningMode('spending_cap_based')}
              className={`text-left p-3 rounded-2xl border transition-all ${
                planningMode === 'spending_cap_based' ? 'border-forest bg-sage/20' : 'border-text-primary/10 hover:bg-text-primary/5'
              }`}
            >
              <p className="text-sm font-semibold">Spending cap</p>
              <p className="text-xs text-text-tertiary">Set a monthly limit</p>
            </button>
          </div>
        </FormField>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <FormField label={planningMode === 'income_based' ? 'Monthly income' : 'Monthly cap'}>
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
          </div>
          <FormField label="Currency">
            <input
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              maxLength={3}
              className="w-full py-2.5 px-3 rounded-xl border border-text-primary/12 bg-bg-lightest/60 text-sm uppercase outline-none focus:border-text-primary/20"
            />
          </FormField>
        </div>

        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={activate}
            onChange={(e) => setActivate(e.target.checked)}
            className="accent-forest"
          />
          Activate immediately
        </label>

        {error && <p className="text-sm text-rust">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <Button type="submit" loading={createBudget.isPending}>
            Create budget
          </Button>
        </div>
      </form>
    </Modal>
  )
}
