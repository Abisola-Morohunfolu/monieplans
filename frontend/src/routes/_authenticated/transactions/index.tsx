import { createFileRoute } from '@tanstack/react-router'
import { ArrowDownLeft, ArrowUpRight, CheckCircle, Plus, Receipt } from 'lucide-react'
import {
  useAllTransactions,
  useConvertTransactionToExpense,
  useConvertTransactionToIncome,
  useUpdateTransactionCategory,
} from '../../../hooks/useStatements'
import { usePreferredCurrency } from '../../../hooks/useCurrency'
import { usePagination, PAGE_SIZE } from '../../../hooks/usePagination'
import { formatCurrency } from '../../../lib/currency'
import { CategorySelect } from '../../../components/ui/CategorySelect'
import { Pagination } from '../../../components/ui/Pagination'
import { EmptyState } from '../../../components/ui/EmptyState'
import type { StatementTransaction } from '../../../types'

interface TransactionsSearch {
  page?: number
}

export const Route = createFileRoute('/_authenticated/transactions/')({
  validateSearch: (search: Record<string, unknown>): TransactionsSearch => ({
    page: search.page ? Number(search.page) : 1,
  }),
  component: TransactionsPage,
})

function TransactionsPage() {
  const { page = 1 } = Route.useSearch()
  const navigate = Route.useNavigate()
  const convertToExpense = useConvertTransactionToExpense('all')
  const convertToIncome = useConvertTransactionToIncome('all')
  const updateCategory = useUpdateTransactionCategory('all')
  const currency = usePreferredCurrency()

  const offset = (page - 1) * PAGE_SIZE
  const { data: transactionsData, isLoading } = useAllTransactions({ limit: PAGE_SIZE, offset })

  const pagination = usePagination({
    total: transactionsData?.pagination.total ?? 0,
    page,
    limit: PAGE_SIZE,
    onPageChange: (next) => navigate({ search: { page: next } }),
  })

  const transactions = transactionsData?.data ?? []

  const isConverted = (t: StatementTransaction) => !!t.convertedToExpenseId || !!t.convertedToIncomeId

  return (
    <div className="space-y-8">
      <header>
        <h2 className="font-heading text-3xl font-medium text-text-primary">Transactions</h2>
        <p className="text-text-secondary mt-1">All transactions imported from your statements.</p>
      </header>

      {isLoading ? (
        <div className="card flex items-center justify-center h-64">
          <p className="text-text-secondary">Loading transactions...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Receipt}
            title="No transactions yet"
            description="Upload a bank statement to see your transactions here."
          />
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="divide-y divide-text-primary/6">
            {transactions.map((txn) => {
              const debit = txn.direction === 'debit'
              const converted = isConverted(txn)
              const pending =
                (convertToExpense.isPending && convertToExpense.variables === txn.id) ||
                (convertToIncome.isPending && convertToIncome.variables === txn.id)

              return (
                <div key={txn.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-text-primary/3 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${debit ? 'bg-rust/10 text-rust' : 'bg-sage/20 text-forest'}`}>
                      {debit ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-text-primary truncate">
                        {txn.merchantName || txn.descriptionRaw || 'Transaction'}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {new Date(txn.postedDate).toLocaleDateString()}
                        {txn.transactionType ? ` · ${txn.transactionType}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {debit && !converted && (
                      <div className="w-44">
                        <CategorySelect
                          compact
                          value={txn.categoryId ?? null}
                          onChange={(categoryId) =>
                            updateCategory.mutate({ transactionId: txn.id, categoryId })
                          }
                          placeholder="Category"
                        />
                      </div>
                    )}
                    <p className={`font-medium text-sm ${debit ? 'text-text-primary' : 'text-forest'}`}>
                      {debit ? '-' : '+'}
                      {formatCurrency(txn.amount ?? 0, txn.currency ?? currency)}
                    </p>
                    {converted ? (
                      <span className="badge-sage text-xs">
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        Converted
                      </span>
                    ) : debit ? (
                      <button
                        onClick={() => convertToExpense.mutate(txn.id)}
                        disabled={pending}
                        className="btn-primary text-xs"
                      >
                        <Plus className="w-4 h-4" />
                        Add expense
                      </button>
                    ) : (
                      <button
                        onClick={() => convertToIncome.mutate(txn.id)}
                        disabled={pending}
                        className="btn-primary text-xs"
                      >
                        <Plus className="w-4 h-4" />
                        Add income
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
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
    </div>
  )
}
