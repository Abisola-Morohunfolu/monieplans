import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Receipt, Plus, Search, Trash2, Pencil, ScanLine } from 'lucide-react'
import { useExpenses, useDeleteExpense } from '../../../hooks/useExpenses'
import { usePreferredCurrency } from '../../../hooks/useCurrency'
import { usePagination, PAGE_SIZE } from '../../../hooks/usePagination'
import { formatCurrency } from '../../../lib/currency'
import { Pagination } from '../../../components/ui/Pagination'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ExpenseFormModal } from '../../../components/expenses/ExpenseFormModal'
import { ReceiptUploadModal } from '../../../components/expenses/ReceiptUploadModal'
import type { Expense } from '../../../types'

interface ExpensesSearch {
  page?: number
}

export const Route = createFileRoute('/_authenticated/expenses/')({
  validateSearch: (search: Record<string, unknown>): ExpensesSearch => ({
    page: search.page ? Number(search.page) : 1,
  }),
  component: ExpensesPage,
})

function ExpensesPage() {
  const { page = 1 } = Route.useSearch()
  const navigate = Route.useNavigate()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const currency = usePreferredCurrency()

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const offset = (page - 1) * PAGE_SIZE
  const { data: expensesData, isLoading } = useExpenses({
    search: debouncedSearch || undefined,
    limit: PAGE_SIZE,
    offset,
  })

  const pagination = usePagination({
    total: expensesData?.pagination.total ?? 0,
    page,
    limit: PAGE_SIZE,
    onPageChange: (next) => navigate({ search: { page: next } }),
  })

  const expenses = expensesData?.data ?? []
  const deleteExpense = useDeleteExpense()

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (expense: Expense) => {
    setEditing(expense)
    setModalOpen(true)
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-heading text-3xl font-medium text-text-primary">Expenses</h2>
          <p className="text-text-secondary mt-1">Track and manage your daily spending.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary" onClick={() => setReceiptOpen(true)}>
            <ScanLine className="w-5 h-5" />
            Scan receipt
          </button>
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="w-5 h-5" />
            Log Expense
          </button>
        </div>
      </header>

      <div className="card flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-lightest border border-text-primary/8 rounded-2xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sage/30 text-text-primary"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="card flex items-center justify-center h-64">
          <p className="text-text-secondary">Loading expenses...</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Receipt}
            title="No expenses recorded"
            description="You haven't logged any expenses yet. Start tracking your spending to stay on top of your budget."
            action={
              <button className="btn-primary" onClick={openCreate}>
                <Plus className="w-5 h-5" />
                Log your first expense
              </button>
            }
          />
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="divide-y divide-text-primary/6">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between p-4 hover:bg-text-primary/3 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-sage/20 flex items-center justify-center text-forest text-sm font-medium shrink-0">
                    {expense.categoryName?.charAt(0) || expense.description?.charAt(0).toUpperCase() || 'E'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-text-primary truncate">
                      {expense.description || 'Expense'}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {new Date(expense.expenseDate).toLocaleDateString()}
                      {expense.categoryName ? ` · ${expense.categoryName}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className="font-medium text-sm text-text-primary">
                    -{formatCurrency(Number(expense.amount), currency)}
                  </p>
                  <button
                    onClick={() => openEdit(expense)}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-forest hover:bg-sage/10 transition-colors"
                    aria-label="Edit expense"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteExpense.mutate(expense.id)}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-rust hover:bg-rust/10 transition-colors"
                    aria-label="Delete expense"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 pb-4">
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
          </div>
        </div>
      )}

      <ExpenseFormModal open={modalOpen} onClose={() => setModalOpen(false)} expense={editing} />
      <ReceiptUploadModal open={receiptOpen} onClose={() => setReceiptOpen(false)} />
    </div>
  )
}
