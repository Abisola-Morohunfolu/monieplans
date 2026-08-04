import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { Plus, Wallet, Lock, CheckCircle } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/budgets/')({
  component: BudgetsPage,
})

function BudgetsPage() {
  const { data: budgets, isLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: async () => {
      const res = await api.get('/budgets')
      return res.data
    },
  })

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold">Budgets</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your budget periods and allocations.</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Create Budget
        </button>
      </header>

      {isLoading ? (
        <div className="glass-card flex items-center justify-center h-64">
          <p className="text-slate-500">Loading budgets...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets?.map((budget: any) => (
            <Link key={budget.id} to={`/budgets/${budget.id}`} className="block">
              <div className="glass-card hover:-translate-y-1 transition-transform cursor-pointer relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4">
                  {budget.status === 'active' ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  ) : budget.status === 'locked' ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-500/10 px-2 py-1 rounded-full">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-blue-500 bg-blue-500/10 px-2 py-1 rounded-full">
                       Draft
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-primary/10 text-primary rounded-xl">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{budget.cycleType === 'calendar_month' ? budget.presetMonth : 'Custom Period'}</h3>
                    <p className="text-sm text-slate-500">
                      {new Date(budget.periodStartDate).toLocaleDateString()} - {new Date(budget.periodEndDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-between items-end border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Total Cap</p>
                    <p className="font-bold">{budget.currency} {budget.monthlyBudgetCapAmount}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-1">Income</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300">{budget.currency} {budget.monthlyIncomeAmount}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
          {(!budgets || budgets.length === 0) && (
            <div className="col-span-full glass-card py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Wallet className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">No budgets found</h3>
              <p className="text-slate-500 max-w-sm">You haven't set up any budget periods yet. Create your first budget to start managing your money.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
