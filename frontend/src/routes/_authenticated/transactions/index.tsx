import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Plus, Search, Trash2, Pencil, Receipt } from 'lucide-react'
import { useTransactions, useDeleteTransaction } from '../../../hooks/useTransactions'
import { usePreferredCurrency } from '../../../hooks/useCurrency'
import { usePagination, PAGE_SIZE } from '../../../hooks/usePagination'
import { formatCurrency } from '../../../lib/currency'
import { Pagination } from '../../../components/ui/Pagination'
import { EmptyState } from '../../../components/ui/EmptyState'
import { TransactionFormModal } from '../../../components/transactions/TransactionFormModal'
import type { Transaction, TransactionType } from '../../../types'

interface TransactionsSearch {
  page?: number
}

export const Route = createFileRoute('/_authenticated/transactions/')({
  validateSearch: (search: Record<string, unknown>): TransactionsSearch => ({
    page: search.page ? Number(search.page) : 1,
  }),
  component: TransactionsPage,
})

type TypeFilter = 'all' | TransactionType

function TransactionsPage() {
  const { page = 1 } = Route.useSearch()
  const navigate = Route.useNavigate()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [type, setType] = useState<TypeFilter>('all')
  const [month, setMonth] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const currency = usePreferredCurrency()
  const deleteTransaction = useDeleteTransaction()

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const offset = (page - 1) * PAGE_SIZE
  const { data: txData, isLoading } = useTransactions({
    search: debouncedSearch || undefined,
    type: type === 'all' ? undefined : type,
    month: month || undefined,
    limit: PAGE_SIZE,
    offset,
  })

  const pagination = usePagination({
    total: txData?.pagination.total ?? 0,
    page,
    limit: PAGE_SIZE,
    onPageChange: (next) => navigate({ search: { page: next } }),
  })

  const transactions = txData?.data ?? []

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (tx: Transaction) => {
    setEditing(tx)
    setModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl sm:text-3xl font-medium text-text-primary">Transactions</h2>
          <p className="text-text-secondary mt-1">Your income and spending, all in one place.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus className="w-5 h-5" />
          Log transaction
        </button>
      </header>

      <div className="card flex flex-col gap-3 md:flex-row md:items-center !p-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search payee or note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-lightest border border-text-primary/8 rounded-2xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sage/30 text-text-primary"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TypeFilter)}
            className="py-2.5 px-3 rounded-2xl border border-text-primary/8 bg-bg-lightest text-sm outline-none"
            aria-label="Filter by type"
          >
            <option value="all">All</option>
            <option value="expense">Expenses</option>
            <option value="income">Income</option>
          </select>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="py-2.5 px-3 rounded-2xl border border-text-primary/8 bg-bg-lightest text-sm outline-none"
            aria-label="Filter by month"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="card flex items-center justify-center h-64">
          <p className="text-text-secondary">Loading transactions...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Receipt}
            title="No transactions"
            description="Log income or expenses and they'll show up here."
            action={
              <button className="btn-primary" onClick={openCreate}>
                <Plus className="w-5 h-5" />
                Log your first transaction
              </button>
            }
          />
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="divide-y divide-text-primary/6">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-3 p-4 hover:bg-text-primary/3 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                      tx.type === 'income' ? 'bg-sage/20 text-forest' : 'bg-rust/10 text-rust'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '−'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-text-primary truncate">
                      {tx.payee || tx.categoryName || (tx.type === 'income' ? 'Income' : 'Expense')}
                    </p>
                    <p className="text-xs text-text-tertiary truncate">
                      {new Date(tx.occurredOn).toLocaleDateString()}
                      {tx.categoryName ? ` · ${tx.categoryName}` : ''}
                      {tx.note ? ` · ${tx.note}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p
                    className={`font-medium text-sm ${
                      tx.type === 'income' ? 'text-forest' : 'text-text-primary'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '−'}
                    {formatCurrency(Number(tx.amount), tx.currency || currency)}
                  </p>
                  <button
                    onClick={() => openEdit(tx)}
                    className="p-2 rounded-lg text-text-tertiary hover:text-forest hover:bg-sage/10 transition-colors"
                    aria-label="Edit transaction"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this transaction?')) deleteTransaction.mutate(tx.id)
                    }}
                    className="p-2 rounded-lg text-text-tertiary hover:text-rust hover:bg-rust/10 transition-colors"
                    aria-label="Delete transaction"
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

      <TransactionFormModal open={modalOpen} onClose={() => setModalOpen(false)} transaction={editing} />
    </div>
  )
}
