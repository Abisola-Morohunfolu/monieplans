import { createFileRoute } from '@tanstack/react-router'
import { Target, Plus, Archive } from 'lucide-react'
import { useGoals, useDeleteGoal } from '../../../hooks/useGoals'

export const Route = createFileRoute('/_authenticated/goals/')({
  component: GoalsPage,
})

function GoalsPage() {
  const { data: goals, isLoading } = useGoals()
  const deleteGoal = useDeleteGoal()

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
        <button className="btn-primary">
          <Plus className="w-5 h-5" />
          Create Goal
        </button>
      </header>

      {isLoading ? (
        <div className="card flex items-center justify-center h-64">
          <p className="text-text-secondary">Loading goals...</p>
        </div>
      ) : !goals || goals.length === 0 ? (
        <div className="card">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-sage/20 rounded-full flex items-center justify-center mb-4">
              <Target className="w-8 h-8 text-sage" />
            </div>
            <h3 className="font-heading text-xl font-semibold mb-2 text-text-primary">No active goals</h3>
            <p className="text-text-secondary max-w-sm mb-6">Whether it's an emergency fund, a vacation, or a new gadget, start saving towards your dreams.</p>
            <button className="btn-primary">
              <Plus className="w-5 h-5" />
              Set your first goal
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((goal) => (
            <div key={goal.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-sage/20 text-forest rounded-2xl">
                  <Target className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2">
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
                <p className="text-2xl font-semibold text-text-primary">${Number(goal.currentAmount).toFixed(2)}</p>
                <p className="text-sm text-text-tertiary">of ${Number(goal.targetAmount).toFixed(2)}</p>
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
      )}
    </div>
  )
}
