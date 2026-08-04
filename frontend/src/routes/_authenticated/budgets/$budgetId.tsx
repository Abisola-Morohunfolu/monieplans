import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { Wallet, Lock, CheckCircle, ArrowLeft, CalendarClock, DollarSign, Target } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/budgets/$budgetId')({
  component: BudgetDetailsPage,
})

function BudgetDetailsPage() {
  const { budgetId } = Route.useParams()
  const queryClient = useQueryClient()

  const { data: budget, isLoading } = useQuery({
    queryKey: ['budgets', budgetId],
    queryFn: async () => {
      const res = await api.get(`/budgets/${budgetId}`)
      return res.data
    },
  })

  const activateMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/budgets/${budgetId}/activate`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', budgetId] })
    },
  })

  const lockMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/budgets/${budgetId}/lock`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', budgetId] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Loading budget details...</p>
      </div>
    )
  }

  if (!budget) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <h3 className="text-xl font-bold mb-2">Budget not found</h3>
        <Link to="/budgets" className="text-primary hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to budgets
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Link to="/budgets" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Budgets
      </Link>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Wallet className="w-5 h-5" />
            </div>
            <h2 className="text-3xl font-bold">
              {budget.cycleType === 'calendar_month' ? budget.presetMonth : 'Custom Budget'}
            </h2>
            {budget.status === 'active' && (
              <span className="flex items-center gap-1 text-sm font-medium text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">
                <CheckCircle className="w-4 h-4" /> Active
              </span>
            )}
            {budget.status === 'locked' && (
              <span className="flex items-center gap-1 text-sm font-medium text-slate-500 bg-slate-500/10 px-3 py-1 rounded-full">
                <Lock className="w-4 h-4" /> Locked
              </span>
            )}
             {budget.status === 'draft' && (
              <span className="flex items-center gap-1 text-sm font-medium text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full">
                Draft
              </span>
            )}
          </div>
          <p className="text-slate-500 dark:text-slate-400">
            {new Date(budget.periodStartDate).toLocaleDateString()} to {new Date(budget.periodEndDate).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {budget.status === 'draft' && (
            <button 
              onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending}
              className="btn-primary flex items-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              {activateMutation.isPending ? 'Activating...' : 'Activate Budget'}
            </button>
          )}
          {budget.status === 'active' && (
            <button 
              onClick={() => lockMutation.mutate()}
              disabled={lockMutation.isPending}
              className="px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors flex items-center gap-2 font-medium"
            >
              <Lock className="w-5 h-5" />
              {lockMutation.isPending ? 'Locking...' : 'Lock Budget'}
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card">
          <div className="flex items-center gap-3 mb-4 text-slate-500">
            <DollarSign className="w-5 h-5" />
            <h3 className="font-medium">Total Cap</h3>
          </div>
          <p className="text-3xl font-bold">{budget.currency} {budget.monthlyBudgetCapAmount}</p>
        </div>
        <div className="glass-card">
          <div className="flex items-center gap-3 mb-4 text-slate-500">
            <Wallet className="w-5 h-5" />
            <h3 className="font-medium">Income</h3>
          </div>
          <p className="text-3xl font-bold">{budget.currency} {budget.monthlyIncomeAmount}</p>
        </div>
        <div className="glass-card">
          <div className="flex items-center gap-3 mb-4 text-slate-500">
            <Target className="w-5 h-5" />
            <h3 className="font-medium">Planning Mode</h3>
          </div>
          <p className="text-xl font-semibold capitalize">{budget.planningMode?.replace('_', ' ')}</p>
        </div>
      </div>

      <div className="glass-card">
        <h3 className="text-xl font-bold mb-6">Weekly Allocations</h3>
        <div className="text-slate-500 flex flex-col items-center justify-center py-12 text-center">
           <CalendarClock className="w-12 h-12 mb-4 opacity-50" />
           <p className="max-w-sm">Weekly allocations will appear here when the budget is active and processed.</p>
        </div>
      </div>
    </div>
  )
}
