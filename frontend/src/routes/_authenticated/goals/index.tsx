import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Target, Plus, Archive } from 'lucide-react'
import { useGoals, useDeleteGoal } from '../../../hooks/useGoals'
import { usePreferredCurrency } from '../../../hooks/useCurrency'
import { usePagination, PAGE_SIZE } from '../../../hooks/usePagination'
import { formatCurrency } from '../../../lib/currency'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Pagination } from '../../../components/ui/Pagination'
import { GoalFormModal } from '../../../components/goals/GoalFormModal'

interface GoalsSearch {
  page?: number
}

export const Route = createFileRoute('/_authenticated/goals/')({
  validateSearch: (search: Record<string, unknown>): GoalsSearch => ({
    page: search.page ? Number(search.page) : 1,
  }),
  component: GoalsPage,
})

function GoalsPage() {
  const { page = 1 } = Route.useSearch()
  const navigate = Route.useNavigate()
  const offset = (page - 1) * PAGE_SIZE
  const { data: goalsData, isLoading } = useGoals({ limit: PAGE_SIZE, offset })
  const deleteGoal = useDeleteGoal()
  const currency = usePreferredCurrency()
  const [modalOpen, setModalOpen] = useState(false)

  const pagination = usePagination({
    total: goalsData?.pagination.total ?? 0,
    page,
    limit: PAGE_SIZE,
    onPageChange: (next) => navigate({ search: { page: next } }),
  })
  const goals = goalsData?.data ?? []

  const handleArchive = (id: string) => {
    if (window.confirm('Archive this goal?')) {
      deleteGoal.mutate(id)
    }
  }

  const progressPct = (current: number, target: number) =>
    Math.min(Math.round((current / target) * 100), 100)

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-heading text-3xl font-medium text-text-primary">Financial Goals</h2>
          <p className="text-text-secondary mt-1">Set, track, and achieve your saving objectives.</p>
        </div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>
          <Plus className="w-5 h-5" />
          Create Goal
        </button>
      </header>

      {isLoading ? (
        <div className="card flex items-center justify-center h-64">
          <p className="text-text-secondary">Loading goals...</p>
        </div>
      ) : goals.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Target}
            title="No active goals"
            description="Whether it's an emergency fund, a vacation, or a new gadget, start saving towards your dreams."
            action={
              <button className="btn-primary" onClick={() => setModalOpen(true)}>
                <Plus className="w-5 h-5" />
                Set your first goal
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {goals.map((goal) => (
              <div key={goal.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-sage/20 text-forest rounded-2xl">
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    {goal.reserveInBudget && <span className="badge-sage">Reserved</span>}
                    <button
                      onClick={() => handleArchive(goal.id)}
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-rust hover:bg-rust/10 transition-colors"
                      title="Archive"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="font-heading font-semibold text-lg text-text-primary mb-1">{goal.name}</h3>
                <div className="flex justify-between items-baseline mb-3">
                  <p className="text-2xl font-semibold text-text-primary">{formatCurrency(Number(goal.currentAmount), currency)}</p>
                  <p className="text-sm text-text-tertiary">of {formatCurrency(Number(goal.targetAmount), currency)}</p>
                </div>
                <div className="w-full bg-text-primary/8 rounded-full h-2 mb-2">
                  <div
                    className="bg-sage h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct(Number(goal.currentAmount), Number(goal.targetAmount))}%` }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-tertiary">{progressPct(Number(goal.currentAmount), Number(goal.targetAmount))}% complete</span>
                  {goal.deadline && (
                    <span className="text-xs text-text-tertiary">by {new Date(goal.deadline).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            canPrev={pagination.canPrev}
            canNext={pagination.canNext}
            onPrev={pagination.prev}
            onNext={pagination.next}
            onPageChange={pagination.setPage}
          />
        </>
      )}

      <GoalFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
