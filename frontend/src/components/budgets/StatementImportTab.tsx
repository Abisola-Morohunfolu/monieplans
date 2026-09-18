import { useRef, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, CheckCircle, Download, FileText, Plus, Receipt, Upload } from 'lucide-react'
import { useStatements, useStatementTransactions, useUploadStatement, useConvertTransactionToExpense, useConvertTransactionToIncome, useUpdateTransactionCategory } from '../../hooks/useStatements'
import { usePreferredCurrency } from '../../hooks/useCurrency'
import { formatCurrency } from '../../lib/currency'
import { CategorySelect } from '../ui/CategorySelect'
import { EmptyState } from '../ui/EmptyState'
import type { StatementTransaction } from '../../types'

interface StatementImportTabProps {
  budgetPeriodId: string
}

export function StatementImportTab({ budgetPeriodId }: StatementImportTabProps) {
  const { data: statementsData, isLoading: statementsLoading } = useStatements({ limit: 100 })
  const uploadStatement = useUploadStatement()
  const convertToExpense = useConvertTransactionToExpense()
  const convertToIncome = useConvertTransactionToIncome()
  const updateCategory = useUpdateTransactionCategory()
  const currency = usePreferredCurrency()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const periodStatements = (statementsData?.data ?? []).filter((s) => s.budgetPeriodId === budgetPeriodId)

  const { data: transactionsData, isLoading: transactionsLoading } = useStatementTransactions(selectedId ?? '', { limit: 200 })
  const transactions = transactionsData?.data ?? []

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await uploadStatement.mutateAsync({ file, budgetPeriodId })
    } catch {
      // handle error
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const isConverted = (t: StatementTransaction) => !!t.convertedToExpenseId || !!t.convertedToIncomeId

  const statusLabel = (status: string) => {
    switch (status) {
      case 'processed':
        return <span className="badge-sage">Processed</span>
      case 'failed':
        return <span className="badge-rust">Failed</span>
      case 'processing':
      case 'uploaded':
        return <span className="badge-neutral">Processing…</span>
      default:
        return <span className="badge-neutral">{status}</span>
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-heading text-xl font-semibold mb-4 text-text-primary">Import statement</h3>
        <p className="text-sm text-text-secondary mb-4">
          Upload a bank statement for this budget period. Transactions are auto-categorized and can be converted into expenses and income below.
        </p>
        <button
          className="btn-primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <div className="w-4 h-4 border-2 border-bg-base border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload className="w-5 h-5" />
          )}
          {uploading ? 'Uploading…' : 'Upload PDF/CSV'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.csv"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <div className="card">
        <h3 className="font-heading text-xl font-semibold mb-4 text-text-primary">Statements</h3>
        {statementsLoading ? (
          <p className="text-text-secondary text-sm">Loading...</p>
        ) : periodStatements.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No statements for this period"
            description="Upload a bank statement to import and review its transactions here."
          />
        ) : (
          <div className="space-y-2">
            {periodStatements.map((stmt) => (
              <button
                key={stmt.id}
                onClick={() => setSelectedId(selectedId === stmt.id ? null : stmt.id)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl transition-colors text-left ${
                  selectedId === stmt.id ? 'bg-sage/10' : 'hover:bg-text-primary/3'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-sage/20 flex items-center justify-center text-forest shrink-0">
                    <Download className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-text-primary truncate">{stmt.fileName}</p>
                    <p className="text-xs text-text-tertiary">
                      {stmt.uploadedAt ? new Date(stmt.uploadedAt).toLocaleDateString() : ''}
                    </p>
                  </div>
                </div>
                {statusLabel(stmt.uploadStatus || stmt.status || '')}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedId && (
        <div className="card overflow-hidden p-0">
          <div className="flex items-center justify-between px-6 py-4 border-b border-text-primary/6">
            <h3 className="font-heading text-xl font-semibold text-text-primary">Review transactions</h3>
            <span className="text-sm text-text-tertiary">{transactions.length} transactions</span>
          </div>

          {transactionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-text-secondary">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
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
      )}
    </div>
  )
}
