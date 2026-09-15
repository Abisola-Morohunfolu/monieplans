import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Wallet, TrendingUp, AlertCircle, Plus, Receipt } from 'lucide-react'
import { useActiveBudget } from '../../hooks/useBudgets'
import { useBudgetSummary } from '../../hooks/useBudget'
import { useRecommendations } from '../../hooks/useAnalytics'
import { usePreferredCurrency } from '../../hooks/useCurrency'
import { api } from '../../lib/api'
import { formatCurrency } from '../../lib/currency'
import { ProgressBar } from '../../components/ui/ProgressBar'

export const Route = createFileRoute('/_authenticated/dashboard')({
  beforeLoad: async () => {
    const { data } = await api.get<{ data: unknown[] }>('/api/budgets')
    if (!data.data || data.data.length === 0) {
      throw redirect({ to: '/onboarding' })
    }
  },
  component: DashboardPage,
})

function DashboardPage() {
  const { data: activeBudget, isLoading: activeBudgetLoading } = useActiveBudget()
  const { data: summary, isLoading: summaryLoading } = useBudgetSummary(
    activeBudget?.id ?? '',
  )
  const { data: recommendations } = useRecommendations()
  const currency = usePreferredCurrency()

  const isLoading = activeBudgetLoading || summaryLoading

  const cap = summary?.cap ?? Number(activeBudget?.cap ?? 0)
  const spent = summary?.spent ?? 0
  const remaining = summary?.remaining ?? cap - spent
  const incomeTotal = summary?.incomeTotal ?? 0
  const recommendationCount =
    recommendations?.data?.filter((r) => r.status === 'active').length ?? 0

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
        <Link to="/expenses" className="btn-primary">
          <Plus className="w-5 h-5" />
          Log expense
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-sage/20 rounded-2xl text-forest">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
          <p className="text-sm text-text-tertiary font-medium">Active Budget Cap</p>
          <h3 className="font-heading text-3xl font-medium mt-1 text-text-primary">
            {formatCurrency(cap, activeBudget?.currency ?? currency)}
          </h3>
        </div>

        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-forest/10 rounded-2xl text-forest">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <p className="text-sm text-text-tertiary font-medium">Spent</p>
          <h3 className="font-heading text-3xl font-medium mt-1 text-text-primary">
            {formatCurrency(spent, currency)}
          </h3>
          <p className="text-xs text-text-tertiary mt-2">
            {formatCurrency(remaining, currency)} remaining · {formatCurrency(incomeTotal, currency)} income
          </p>
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
        <div className="lg:col-span-2 card">
          <h3 className="font-heading text-xl font-semibold mb-4 text-text-primary">Spending</h3>
          <div className="mb-3">
            <ProgressBar value={spent} max={cap || 1} color={spent > cap ? 'rust' : 'sage'} />
          </div>
          <p className="text-sm text-text-secondary">
            {cap > 0
              ? `${Math.round((spent / cap) * 100)}% of your budget used`
              : 'Set a budget cap to track usage.'}
          </p>

          <div className="mt-6">
            <h4 className="text-sm font-medium text-text-secondary mb-3">By category</h4>
            {!summary?.categoryTotals || summary.categoryTotals.length === 0 ? (
              <div className="flex items-center gap-2 text-text-tertiary py-4">
                <Receipt className="w-4 h-4" /> No spending yet this period.
              </div>
            ) : (
              <div className="space-y-3">
                {summary.categoryTotals.map((cat) => (
                  <div key={cat.categoryId ?? cat.categoryName ?? 'uncategorized'} className="flex items-center gap-3">
                    <span className="text-sm text-text-primary w-40 truncate">
                      {cat.categoryName ?? 'Uncategorized'}
                    </span>
                    <div className="flex-1">
                      <ProgressBar value={cat.amount} max={spent || 1} />
                    </div>
                    <span className="text-sm text-text-secondary w-24 text-right">
                      {formatCurrency(cat.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="font-heading text-xl font-semibold mb-4 text-text-primary">Recommendations</h3>
          {recommendationCount === 0 ? (
            <p className="text-text-tertiary text-sm">No new recommendations.</p>
          ) : (
            <div className="space-y-3">
              {recommendations?.data
                ?.filter((r) => r.status === 'active')
                .map((r) => (
                  <div key={r.id} className="p-3 rounded-2xl bg-text-primary/3">
                    <p className="text-sm font-medium text-text-primary">{r.title}</p>
                    <p className="text-xs text-text-secondary mt-1">{r.body}</p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
