import { createFileRoute, Link } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { FileText, Download, Upload } from 'lucide-react'
import { useStatements, useUploadStatement } from '../../../hooks/useStatements'
import { useBudgets } from '../../../hooks/useBudgets'
import { usePagination, PAGE_SIZE } from '../../../hooks/usePagination'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Pagination } from '../../../components/ui/Pagination'

interface StatementsSearch {
  page?: number
}

export const Route = createFileRoute('/_authenticated/statements/')({
  validateSearch: (search: Record<string, unknown>): StatementsSearch => ({
    page: search.page ? Number(search.page) : 1,
  }),
  component: StatementsPage,
})

function StatementsPage() {
  const { page = 1 } = Route.useSearch()
  const navigate = Route.useNavigate()
  const offset = (page - 1) * PAGE_SIZE
  const { data: statementsData, isLoading } = useStatements({ limit: PAGE_SIZE, offset })
  const uploadStatement = useUploadStatement()
  const { data: budgetsData } = useBudgets({ limit: 100 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [budgetPeriodId, setBudgetPeriodId] = useState('')

  const pagination = usePagination({
    total: statementsData?.pagination.total ?? 0,
    page,
    limit: PAGE_SIZE,
    onPageChange: (next) => navigate({ search: { page: next } }),
  })
  const statements = statementsData?.data ?? []

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await uploadStatement.mutateAsync({ file, budgetPeriodId: budgetPeriodId || null })
    } catch {
      // handle error
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

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
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-heading text-3xl font-medium text-text-primary">Statements</h2>
          <p className="text-text-secondary mt-1">Import bank statements and review transactions.</p>
        </div>
      </header>

      <div className="card">
        <h3 className="font-heading text-xl font-semibold mb-4 text-text-primary">Upload statement</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={budgetPeriodId}
            onChange={(e) => setBudgetPeriodId(e.target.value)}
            className="py-2.5 px-3 rounded-xl border border-text-primary/12 bg-bg-lightest/60 text-sm outline-none focus:border-text-primary/20"
          >
            <option value="">No budget period</option>
            {budgetsData?.data.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.periodStartDate})
              </option>
            ))}
          </select>
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
            {uploading ? 'Uploading…' : 'Upload PDF'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      <div className="card">
        <h3 className="font-heading text-xl font-semibold mb-6 text-text-primary">Past Statements</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-text-secondary">Loading...</p>
          </div>
        ) : statements.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No statements yet"
            description="Upload a bank statement to auto-categorize and review your transactions."
          />
        ) : (
          <div className="space-y-3">
            {statements.map((stmt) => (
              <Link
                key={stmt.id}
                to="/statements/$statementId"
                params={{ statementId: stmt.id }}
                className="flex items-center justify-between p-4 rounded-2xl hover:bg-text-primary/3 transition-colors"
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
              </Link>
            ))}
          </div>
        )}
        <div className="pt-4">
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
    </div>
  )
}
