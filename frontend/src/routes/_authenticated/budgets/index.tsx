import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Wallet, Lock, CheckCircle } from 'lucide-react'
import { useBudgets } from '../../../hooks/useBudgets'
import { usePreferredCurrency } from '../../../hooks/useCurrency'
import { usePagination, PAGE_SIZE } from '../../../hooks/usePagination'
import { formatCurrency } from '../../../lib/currency'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Pagination } from '../../../components/ui/Pagination'
import { BudgetFormModal } from '../../../components/budgets/BudgetFormModal'

interface BudgetsSearch {
  page?: number
}

export const Route = createFileRoute('/_authenticated/budgets/')({
  validateSearch: (search: Record<string, unknown>): BudgetsSearch => ({
    page: search.page ? Number(search.page) : 1,
  }),
  component: BudgetsPage,
})

function BudgetsPage() {
  const { page = 1 } = Route.useSearch()
  const navigate = Route.useNavigate()
  const offset = (page - 1) * PAGE_SIZE
  const { data: budgetsData, isLoading } = useBudgets({ limit: PAGE_SIZE, offset })
  const [modalOpen, setModalOpen] = useState(false)
  const currency = usePreferredCurrency()

  const pagination = usePagination({
    total: budgetsData?.pagination.total ?? 0,
    page,
    limit: PAGE_SIZE,
    onPageChange: (next) => navigate({ search: { page: next } }),
  })
  const budgets = budgetsData?.data ?? []

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
        <button className="btn-primary" onClick={() => setModalOpen(true)}>
          <Plus className="w-5 h-5" />
          Create Budget
        </button>
      </header>

      {isLoading ? (
        <div className="card flex items-center justify-center h-64">
          <p className="text-text-secondary">Loading budgets...</p>
        </div>
      ) : budgets.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Wallet}
            title="No budgets found"
            description="You haven't set up any budget periods yet. Create your first budget to start managing your money."
            action={
              <button className="btn-primary" onClick={() => setModalOpen(true)}>
                <Plus className="w-5 h-5" />
                Create your first budget
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {budgets.map((budget) => (
              <Link key={budget.id} to="/budgets/$budgetId" params={{ budgetId: budget.id }} className="block">
                <div className="card relative overflow-hidden group cursor-pointer h-full">
                  <div className="absolute top-4 right-4">{statusBadge(budget.status)}</div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-sage/20 text-forest rounded-2xl">
                      <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold text-lg text-text-primary">{budget.name}</h3>
                      <p className="text-sm text-text-tertiary">
                        {budget.periodStartDate} – {budget.periodEndDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-t border-text-primary/8 pt-4 mt-4">
                    <div>
                      <p className="text-xs text-text-tertiary mb-1">Cap</p>
                      <p className="font-semibold text-text-primary">{formatCurrency(Number(budget.cap), budget.currency ?? currency)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-text-tertiary mb-1">Income</p>
                      <p className="font-medium text-text-secondary">{formatCurrency(Number(budget.income), budget.currency ?? currency)}</p>
                    </div>
                  </div>
                </div>
              </Link>
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

      <BudgetFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
