import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Wallet, TrendingUp, PiggyBank } from 'lucide-react'
import { useActivateBudget, useBudget, useBudgetSummary, useSetAssignments } from '../../../hooks/useBudget'
import { usePreferredCurrency } from '../../../hooks/useCurrency'
import { formatCurrency } from '../../../lib/currency'
import { addMonths, currentMonth, monthLabel } from '../../../lib/month'
import { TransactionFormModal } from '../../../components/transactions/TransactionFormModal'
import type { CategorySummary } from '../../../types'

interface BudgetsSearch {
  month?: string
}

export const Route = createFileRoute('/_authenticated/budgets/')({
  validateSearch: (search: Record<string, unknown>): BudgetsSearch => ({
    month: typeof search.month === 'string' ? search.month : undefined,
  }),
  component: BudgetsPage,
})

function BudgetsPage() {
  const { month: monthParam } = Route.useSearch()
  const navigate = Route.useNavigate()
  const month = monthParam ?? currentMonth()

  const { data: budget, isLoading: budgetLoading } = useBudget(month)
  const { data: summary, isLoading } = useBudgetSummary(month, !!budget)
  const activateBudget = useActivateBudget(month)
  const setAssignments = useSetAssignments(month)
  const currency = usePreferredCurrency()

  const activatedRef = useRef<string | null>(null)
  useEffect(() => {
    if (budget !== null) return
    if (activatedRef.current === month) return
    activatedRef.current = month
    activateBudget.mutate()
  }, [budget, month, activateBudget])

  const [draft, setDraft] = useState<Record<string, string>>({})
  const [txOpen, setTxOpen] = useState(false)

  const dirty = Object.keys(draft).length > 0

  const grouped = useMemo(() => {
    const map = new Map<string, CategorySummary[]>()
    for (const c of summary?.categories ?? []) {
      const group = c.groupName?.trim() || 'Other'
      const list = map.get(group) ?? []
      list.push(c)
      map.set(group, list)
    }
    return Array.from(map.entries())
  }, [summary])

  const goTo = (next: string) => {
    setDraft({})
    navigate({ to: '/budgets', search: { month: next } })
  }

  const setAssigned = (categoryId: string, value: string) => {
    setDraft((d) => ({ ...d, [categoryId]: value }))
  }

  const effectiveAssigned = (c: CategorySummary) => {
    if (draft[c.id] !== undefined) {
      const n = Number(draft[c.id])
      return Number.isFinite(n) ? n : 0
    }
    return c.assigned
  }

  const handleSave = async () => {
    if (!summary) return
    const assignments = summary.categories.map((c) => ({
      categoryId: c.id,
      assigned: effectiveAssigned(c),
    }))
    await setAssignments.mutateAsync({ assignments })
    setDraft({})
  }

  const totals = summary?.totals

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl sm:text-3xl font-medium text-text-primary">Budget</h2>
          <p className="text-text-secondary mt-1">Plan where your money goes this month.</p>
        </div>
        <button className="btn-primary" onClick={() => setTxOpen(true)}>
          <Plus className="w-5 h-5" />
          Log transaction
        </button>
      </header>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => goTo(addMonths(month, -1))}
          className="p-2 rounded-xl text-text-secondary hover:bg-text-primary/5 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="font-heading text-lg font-semibold text-text-primary">{monthLabel(month)}</h3>
        <button
          onClick={() => goTo(addMonths(month, 1))}
          className="p-2 rounded-xl text-text-secondary hover:bg-text-primary/5 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {isLoading || budgetLoading ? (
        <div className="card flex items-center justify-center h-48">
          <p className="text-text-secondary">Loading budget...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card !p-4">
              <div className="flex items-center gap-2 text-text-tertiary mb-1">
                <Wallet className="w-4 h-4" />
                <span className="text-xs font-medium">Assigned</span>
              </div>
              <p className="font-heading text-2xl font-medium text-text-primary">
                {formatCurrency(totals?.totalAssigned ?? 0, currency)}
              </p>
            </div>
            <div className="card !p-4">
              <div className="flex items-center gap-2 text-text-tertiary mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium">Income</span>
              </div>
              <p className="font-heading text-2xl font-medium text-text-primary">
                {formatCurrency(totals?.totalIncome ?? 0, currency)}
              </p>
            </div>
            <div className="card !p-4">
              <div className="flex items-center gap-2 text-text-tertiary mb-1">
                <span className="text-xs font-medium">Spent</span>
              </div>
              <p className="font-heading text-2xl font-medium text-text-primary">
                {formatCurrency(totals?.totalExpense ?? 0, currency)}
              </p>
            </div>
            <div className="card !p-4">
              <div className="flex items-center gap-2 text-text-tertiary mb-1">
                <PiggyBank className="w-4 h-4" />
                <span className="text-xs font-medium">To assign</span>
              </div>
              <p className="font-heading text-2xl font-medium text-text-primary">
                {formatCurrency(totals?.unassigned ?? 0, currency)}
              </p>
            </div>
          </div>

          {grouped.length === 0 ? (
            <div className="card">
              <p className="text-text-secondary text-sm">
                No expense categories yet. Log a transaction or add a category to get started.
              </p>
            </div>
          ) : (
            grouped.map(([group, categories]) => (
              <div key={group} className="card">
                <h3 className="font-heading text-lg font-semibold text-text-primary mb-4">{group}</h3>
                <div className="space-y-2">
                  {categories.map((c) => {
                    const assigned = effectiveAssigned(c)
                    const available = assigned - c.activity
                    return (
                      <div
                        key={c.id}
                        className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{c.name}</p>
                          <p className="text-xs text-text-tertiary">
                            {formatCurrency(c.activity, currency)} of {formatCurrency(assigned, currency)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            value={draft[c.id] ?? String(c.assigned)}
                            onChange={(e) => setAssigned(c.id, e.target.value)}
                            className="w-28 py-2 px-3 rounded-xl border border-text-primary/12 bg-bg-lightest/60 text-sm text-right outline-none focus:border-text-primary/20"
                            aria-label={`Assigned for ${c.name}`}
                          />
                        </div>
                        <div className="col-span-2">
                          <span
                            className={`text-xs font-medium ${
                              available < 0 ? 'text-rust' : 'text-text-secondary'
                            }`}
                          >
                            {formatCurrency(available, currency)} available
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}

          {dirty && (
            <div className="sticky bottom-24 md:bottom-6 flex justify-end">
              <button
                className="btn-primary shadow-lg"
                onClick={handleSave}
                disabled={setAssignments.isPending}
              >
                {setAssignments.isPending ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          )}
        </>
      )}

      <TransactionFormModal open={txOpen} onClose={() => setTxOpen(false)} />
    </div>
  )
}
