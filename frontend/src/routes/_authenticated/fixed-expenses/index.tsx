import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { CalendarClock, Plus, Pencil, Trash2 } from 'lucide-react'
import { useFixedExpenseTemplates, useDeleteFixedExpenseTemplate } from '../../../hooks/useFixedExpenses'
import { usePreferredCurrency } from '../../../hooks/useCurrency'
import { usePagination, PAGE_SIZE } from '../../../hooks/usePagination'
import { formatCurrency } from '../../../lib/currency'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Pagination } from '../../../components/ui/Pagination'
import { FixedExpenseFormModal } from '../../../components/fixed-expenses/FixedExpenseFormModal'
import type { FixedExpenseTemplate } from '../../../types'

interface FixedExpensesSearch {
  page?: number
}

export const Route = createFileRoute('/_authenticated/fixed-expenses/')({
  validateSearch: (search: Record<string, unknown>): FixedExpensesSearch => ({
    page: search.page ? Number(search.page) : 1,
  }),
  component: FixedExpensesPage,
})

function FixedExpensesPage() {
  const { page = 1 } = Route.useSearch()
  const navigate = Route.useNavigate()
  const offset = (page - 1) * PAGE_SIZE
  const { data: templatesData, isLoading } = useFixedExpenseTemplates({ limit: PAGE_SIZE, offset })
  const deleteTemplate = useDeleteFixedExpenseTemplate()
  const currency = usePreferredCurrency()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<FixedExpenseTemplate | null>(null)

  const pagination = usePagination({
    total: templatesData?.pagination.total ?? 0,
    page,
    limit: PAGE_SIZE,
    onPageChange: (next) => navigate({ search: { page: next } }),
  })
  const templates = templatesData?.data ?? []

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this fixed expense template?')) {
      deleteTemplate.mutate(id)
    }
  }

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (template: FixedExpenseTemplate) => {
    setEditing(template)
    setModalOpen(true)
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-heading text-3xl font-medium text-text-primary">Fixed Expenses</h2>
          <p className="text-text-secondary mt-1">Manage your recurring bills and subscriptions.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus className="w-5 h-5" />
          Add Fixed Expense
        </button>
      </header>

      {isLoading ? (
        <div className="card flex items-center justify-center h-64">
          <p className="text-text-secondary">Loading...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={CalendarClock}
            title="No fixed expenses yet"
            description="Add your rent, utilities, subscriptions, and other recurring bills to ensure they are automatically accounted for."
            action={
              <button className="btn-primary" onClick={openCreate}>
                <Plus className="w-5 h-5" />
                Add your first bill
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div key={template.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-sage/20 text-forest rounded-2xl">
                    <CalendarClock className="w-5 h-5" />
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(template)}
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-forest hover:bg-sage/10 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-rust hover:bg-rust/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="font-heading font-semibold text-lg text-text-primary mb-1">{template.name}</h3>
                <p className="text-2xl font-semibold text-text-primary mb-2">{formatCurrency(Number(template.amount), currency)}</p>
                <div className="flex items-center gap-2">
                  <span className="badge-sage capitalize">{template.frequency}</span>
                  {template.categoryName && <span className="badge-neutral">{template.categoryName}</span>}
                </div>
              </div>
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

      <FixedExpenseFormModal open={modalOpen} onClose={() => setModalOpen(false)} template={editing} />
    </div>
  )
}
