import { createFileRoute, Link } from '@tanstack/react-router'
import { Wallet, Lock, CheckCircle, ArrowLeft, CalendarClock, DollarSign, Target } from 'lucide-react'
import { useBudget, useActivateBudget, useLockBudget } from '../../../hooks/useBudget'

export const Route = createFileRoute('/_authenticated/budgets/$budgetId')({
  component: BudgetDetailsPage,
})

function BudgetDetailsPage() {
  const { budgetId } = Route.useParams()
  const { data: budget, isLoading } = useBudget(budgetId)
  const activateMutation = useActivateBudget(budgetId)
  const lockMutation = useLockBudget(budgetId)

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="badge-sage text-sm"><CheckCircle className="w-4 h-4 mr-1" /> Active</span>
      case 'locked':
        return <span className="badge-neutral text-sm"><Lock className="w-4 h-4 mr-1" /> Locked</span>
      default:
        return <span className="badge-neutral text-sm">Draft</span>
    }
  }

  if (isLoading) {
    return (
      <div className="card flex items-center justify-center h-64">
        <p className="text-text-secondary">Loading budget details...</p>
      </div>
    )
  }

  if (!budget) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <h3 className="font-heading text-xl font-medium mb-2">Budget not found</h3>
        <Link to="/budgets" className="text-sage hover:text-forest flex items-center gap-1 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to budgets
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Link to="/budgets" className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Budgets
      </Link>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-sage/20 text-forest rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
            <h2 className="font-heading text-3xl font-medium text-text-primary">
              {budget.name}
            </h2>
            {statusBadge(budget.status)}
          </div>
          <p className="text-text-secondary capitalize">Cycle: {budget.cycle}</p>
        </div>

        <div className="flex items-center gap-3">
          {budget.status === 'draft' && (
            <button
              onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending}
              className="btn-primary"
            >
              <CheckCircle className="w-5 h-5" />
              {activateMutation.isPending ? 'Activating...' : 'Activate Budget'}
            </button>
          )}
          {budget.status === 'active' && (
            <button
              onClick={() => lockMutation.mutate()}
              disabled={lockMutation.isPending}
              className="px-4 py-2.5 bg-text-primary text-bg-base rounded-full hover:bg-forest transition-colors flex items-center gap-2 font-medium text-sm"
            >
              <Lock className="w-5 h-5" />
              {lockMutation.isPending ? 'Locking...' : 'Lock Budget'}
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-4 text-text-tertiary">
            <DollarSign className="w-5 h-5" />
            <h3 className="font-medium">Total Cap</h3>
          </div>
          <p className="font-heading text-3xl font-medium text-text-primary">${Number(budget.cap).toLocaleString()}</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-3 mb-4 text-text-tertiary">
            <Wallet className="w-5 h-5" />
            <h3 className="font-medium">Income</h3>
          </div>
          <p className="font-heading text-3xl font-medium text-text-primary">${Number(budget.income).toLocaleString()}</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-3 mb-4 text-text-tertiary">
            <Target className="w-5 h-5" />
            <h3 className="font-medium">Planning Mode</h3>
          </div>
          <p className="font-heading text-xl font-medium capitalize text-text-primary">{budget.planningMode?.replace(/_/g, ' ')}</p>
        </div>
      </div>

      <div className="card">
        <h3 className="font-heading text-xl font-semibold mb-6 text-text-primary">Weekly Allocations</h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CalendarClock className="w-12 h-12 mb-4 text-sage/50" />
          <p className="text-text-secondary max-w-sm">Weekly allocations will appear here when the budget is active and processed.</p>
        </div>
      </div>
    </div>
  )
}
