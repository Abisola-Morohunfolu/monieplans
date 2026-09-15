import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { FormField } from '../ui/FormField'
import { Button } from '../ui/Button'
import { useCreateGoal } from '../../hooks/useGoals'

interface GoalFormModalProps {
  open: boolean
  onClose: () => void
}

export function GoalFormModal({ open, onClose }: GoalFormModalProps) {
  const createGoal = useCreateGoal()

  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [deadline, setDeadline] = useState('')
  const [reserveInBudget, setReserveInBudget] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setName('')
      setTargetAmount('')
      setDeadline('')
      setReserveInBudget(false)
      setError('')
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Enter a goal name.')
      return
    }
    const numericTarget = Number(targetAmount)
    if (!numericTarget || numericTarget <= 0) {
      setError('Enter a target amount greater than 0.')
      return
    }
    setError('')

    await createGoal.mutateAsync({
      name,
      targetAmount: numericTarget,
      targetDate: deadline || undefined,
      reserveInBudget,
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Create goal">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Goal name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Emergency fund"
            className="w-full py-2.5 px-3 rounded-xl border border-text-primary/12 bg-bg-lightest/60 text-sm outline-none focus:border-text-primary/20"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Target amount">
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="0.00"
              className="w-full py-2.5 px-3 rounded-xl border border-text-primary/12 bg-bg-lightest/60 text-sm outline-none focus:border-text-primary/20"
            />
          </FormField>
          <FormField label="Target date (optional)">
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl border border-text-primary/12 bg-bg-lightest/60 text-sm outline-none focus:border-text-primary/20"
            />
          </FormField>
        </div>

        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={reserveInBudget}
            onChange={(e) => setReserveInBudget(e.target.checked)}
            className="accent-forest"
          />
          Reserve in budget
        </label>

        {error && <p className="text-sm text-rust">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <Button type="submit" loading={createGoal.isPending}>
            Create goal
          </Button>
        </div>
      </form>
    </Modal>
  )
}
