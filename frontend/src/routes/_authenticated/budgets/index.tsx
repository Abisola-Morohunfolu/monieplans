import { createFileRoute, Link } from '@tanstack/react-router'
import { Plus, Wallet, Lock, CheckCircle } from 'lucide-react'
import { useBudgets } from '../../../hooks/useBudgets'

export const Route = createFileRoute('/_authenticated/budgets/')({
  component: BudgetsPage,
})

function BudgetsPage() {
  const { data: budgets, isLoading } = useBudgets()

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="badge-sage"><CheckCircle className="w-3 h-3 mr-1" /> Active</span>
      case 'locked':
        return <span className="badge-neutral"><Lock className="w-3 h-3 mr-1" /> Locked</span>
      default:
        return <span className="badge-neutral">Draft</span>
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="font-heading text-3xl font-medium text-text-primary">Budgets</h2>
          <p className="text-text-secondary mt-1">Manage your budget periods and allocations.</p>
        </div>
        <button className="btn-primary">
          <Plus className="w-5 h-5" />
          Create Budget
        </button>
      </header>

      {isLoading ? (
        <div className="card flex items-center justify-center h-64">
          <p className="text-text-secondary">Loading budgets...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets?.map((budget) => (
            <Link key={budget.id} to="/budgets/$budgetId" params={{ budgetId: budget.id }} className="block">
              <div className="card relative overflow-hidden group cursor-pointer">
                <div className="absolute top-4 right-4">
                  {statusBadge(budget.status)}
                </div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-sage/20 text-forest rounded-2xl">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-lg text-text-primary">{budget.name}</h3>
                    <p className="text-sm text-text-tertiary capitalize">{budget.cycle}</p>
                  </div>
                </div>

                <div className="flex justify-between items-end border-t border-text-primary/8 pt-4 mt-4">
                  <div>
                    <p className="text-xs text-text-tertiary mb-1">Cap</p>
                    <p className="font-semibold text-text-primary">${Number(budget.cap).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-tertiary mb-1">Income</p>
                    <p className="font-medium text-text-secondary">${Number(budget.income).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
          {(!budgets || budgets.length === 0) && (
            <div className="col-span-full card py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-sage/20 rounded-full flex items-center justify-center mb-4">
                <Wallet className="w-8 h-8 text-sage" />
              </div>
              <h3 className="font-heading text-xl font-semibold mb-2 text-text-primary">No budgets found</h3>
              <p className="text-text-secondary max-w-sm">You haven't set up any budget periods yet. Create your first budget to start managing your money.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
