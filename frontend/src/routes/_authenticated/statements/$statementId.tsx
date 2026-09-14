import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, CheckCircle, FileText, Plus, Receipt } from 'lucide-react'
import {
  useStatement,
  useStatementTransactions,
  useConvertTransactionToExpense,
  useConvertTransactionToIncome,
  useUpdateTransactionCategory,
} from '../../../hooks/useStatements'
import { useCategories } from '../../../hooks/useCategories'
import { usePreferredCurrency } from '../../../hooks/useCurrency'
import { formatCurrency } from '../../../lib/currency'
import type { StatementTransaction } from '../../../types'

export const Route = createFileRoute('/_authenticated/statements/$statementId')({
  component: StatementReviewPage,
})

function StatementReviewPage() {
  const { statementId } = Route.useParams()
  const { data: statement, isLoading: statementLoading } = useStatement(statementId)
  const { data: transactions, isLoading: transactionsLoading } = useStatementTransactions(statementId)
  const convertToExpense = useConvertTransactionToExpense(statementId)
  const convertToIncome = useConvertTransactionToIncome(statementId)
  const updateCategory = useUpdateTransactionCategory(statementId)
  const { data: categories } = useCategories()
  const currency = usePreferredCurrency()

  const isLoading = statementLoading || transactionsLoading

  const categoryOptions = categories?.filter((c) => c.code !== 'uncategorized') ?? []

  const totalDebits =
    transactions?.filter((t) => t.direction === 'debit').reduce((sum, t) => sum + (t.amount ?? 0), 0) ?? 0
  const totalCredits =
    transactions?.filter((t) => t.direction === 'credit').reduce((sum, t) => sum + (t.amount ?? 0), 0) ?? 0
  const toReview =
    transactions?.filter((t) => !t.convertedToExpenseId && !t.convertedToIncomeId).length ?? 0

  const isConverted = (t: StatementTransaction) => !!t.convertedToExpenseId || !!t.convertedToIncomeId

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-8 w-64 bg-text-primary/5 rounded-lg animate-pulse" />
        <div className="card h-64 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Link
        to="/statements"
        className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Statements
      </Link>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-sage/20 text-forest rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="font-heading text-3xl font-medium text-text-primary">
              {statement?.fileName ?? 'Statement'}
            </h2>
          </div>
          <p className="text-text-secondary">
            {statement?.statementPeriodStart && statement?.statementPeriodEnd
              ? `${new Date(statement.statementPeriodStart).toLocaleDateString()} – ${new Date(statement.statementPeriodEnd).toLocaleDateString()}`
              : 'Review and convert transactions to expenses or income.'}
          </p>
        </div>
        <span className="badge-sage">{statement?.uploadStatus || statement?.status}</span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <p className="text-sm text-text-tertiary font-medium">Total Out</p>
          <h3 className="font-heading text-3xl font-medium mt-1 text-rust">
            -{formatCurrency(totalDebits, currency)}
          </h3>
        </div>
        <div className="card">
          <p className="text-sm text-text-tertiary font-medium">Total In</p>
          <h3 className="font-heading text-3xl font-medium mt-1 text-forest">
            +{formatCurrency(totalCredits, currency)}
          </h3>
        </div>
        <div className="card">
          <p className="text-sm text-text-tertiary font-medium">To Review</p>
          <h3 className="font-heading text-3xl font-medium mt-1 text-text-primary">{toReview}</h3>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-text-primary/6">
          <h3 className="font-heading text-xl font-semibold text-text-primary">Transactions</h3>
          <span className="text-sm text-text-tertiary">{transactions?.length ?? 0} total</span>
        </div>

        {!transactions || transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Receipt className="w-12 h-12 mb-4 text-sage/50" />
            <p className="text-text-secondary">No transactions to review yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-text-primary/6">
            {transactions.map((txn) => {
              const debit = txn.direction === 'debit'
              const converted = isConverted(txn)
              const pending =
                (convertToExpense.isPending && convertToExpense.variables === txn.id) ||
                (convertToIncome.isPending && convertToIncome.variables === txn.id)

              return (
                <div key={txn.id} className="flex items-center justify-between gap-4 p-4 hover:bg-text-primary/3 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${debit ? 'bg-rust/10 text-rust' : 'bg-sage/20 text-forest'}`}>
                      {debit ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-text-primary truncate">
                        {txn.merchantName || txn.descriptionRaw || 'Transaction'}
                      </p>
                      <p className="text-xs text-text-tertiary truncate">
                        {new Date(txn.postedDate).toLocaleDateString()}
                        {txn.transactionType ? ` · ${txn.transactionType}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {debit && (
                      <div className="flex items-center gap-1.5">
                        {txn.categoryId && !txn.isUserCorrected && (
                          <span className="text-[10px] uppercase tracking-wide text-text-tertiary">auto</span>
                        )}
                        <select
                          value={txn.categoryId ?? ''}
                          disabled={updateCategory.isPending && updateCategory.variables?.transactionId === txn.id}
                          onChange={(e) =>
                            updateCategory.mutate({
                              transactionId: txn.id,
                              categoryId: e.target.value || null,
                            })
                          }
                          className="bg-bg-lightest border border-text-primary/8 rounded-xl px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-sage/30"
                        >
                          <option value="">Uncategorized</option>
                          {categoryOptions.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
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
                        {pending ? 'Adding...' : 'Add expense'}
                      </button>
                    ) : (
                      <button
                        onClick={() => convertToIncome.mutate(txn.id)}
                        disabled={pending}
                        className="btn-primary text-xs"
                      >
                        <Plus className="w-4 h-4" />
                        {pending ? 'Adding...' : 'Add income'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
