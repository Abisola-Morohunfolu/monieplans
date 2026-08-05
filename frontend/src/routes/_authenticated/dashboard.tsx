import { createFileRoute } from '@tanstack/react-router'
import { Wallet, TrendingUp, AlertCircle, Receipt } from 'lucide-react'
import { useBudgets, useActiveBudget } from '../../hooks/useBudgets'
import { useExpenses } from '../../hooks/useExpenses'
import { useRecommendations } from '../../hooks/useAnalytics'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { data: budgets, isLoading: budgetsLoading } = useBudgets()
  const { data: activeBudget, isLoading: activeBudgetLoading } = useActiveBudget()
  const { data: expenses, isLoading: expensesLoading } = useExpenses()
  const { data: recommendations, isLoading: recsLoading } = useRecommendations()

  const isLoading = budgetsLoading || activeBudgetLoading || expensesLoading || recsLoading

  const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0
  const budgetCap = activeBudget ? Number(activeBudget.cap) : 0
  const remaining = budgetCap - totalExpenses
  const recentTransactions = expenses?.slice(0, 5) ?? []
  const recommendationCount = recommendations?.filter((r) => r.status === 'pending').length ?? 0

  if (isLoading) {
    return (
      <div className="space-y-8">
        <header>
          <div className="h-9 w-48 bg-text-primary/5 rounded-lg animate-pulse mb-2" />
          <div className="h-5 w-72 bg-text-primary/5 rounded animate-pulse" />
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-40 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="font-heading text-3xl font-medium text-text-primary">Dashboard</h2>
          <p className="text-text-secondary mt-1">Here's your financial overview.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-sage/20 rounded-2xl text-forest">
              <Wallet className="w-6 h-6" />
            </div>
            <span className="badge-sage">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              {budgets?.length ?? 0} budgets
            </span>
          </div>
          <p className="text-sm text-text-tertiary font-medium">Active Budget Cap</p>
          <h3 className="font-heading text-3xl font-medium mt-1 text-text-primary">
            ${budgetCap.toLocaleString()}
          </h3>
        </div>

        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-forest/10 rounded-2xl text-forest">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <p className="text-sm text-text-tertiary font-medium">Total Expenses</p>
          <h3 className="font-heading text-3xl font-medium mt-1 text-text-primary">
            ${totalExpenses.toLocaleString()}
          </h3>
          {budgetCap > 0 && (
            <p className="text-xs text-text-tertiary mt-2">
              ${remaining.toLocaleString()} remaining
            </p>
          )}
        </div>

        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-rust/10 rounded-2xl text-rust">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
          <p className="text-sm text-text-tertiary font-medium">AI Recommendations</p>
          <h3 className="font-heading text-3xl font-medium mt-1 text-text-primary">
            {recommendationCount} New
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 card h-96 flex items-center justify-center">
          <p className="text-text-tertiary">Spending Chart Placeholder</p>
        </div>

        <div className="card">
          <h3 className="font-heading text-xl font-semibold mb-4 text-text-primary">Recent Transactions</h3>
          {recentTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Receipt className="w-10 h-10 text-sage mb-3" />
              <p className="text-text-tertiary">No transactions yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-text-primary/3 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-sage/20 flex items-center justify-center text-forest text-sm font-medium">
                      {tx.description?.charAt(0).toUpperCase() || 'T'}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-text-primary">{tx.description || 'Transaction'}</p>
                      <p className="text-xs text-text-tertiary">{new Date(tx.date ?? '').toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className="font-medium text-sm text-text-primary">-${Number(tx.amount).toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
