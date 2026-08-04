import { createFileRoute } from '@tanstack/react-router'
import { CalendarClock, Plus, Pencil, Trash2 } from 'lucide-react'
import { useFixedExpenseTemplates, useDeleteFixedExpenseTemplate } from '../../../hooks/useFixedExpenses'

export const Route = createFileRoute('/_authenticated/fixed-expenses/')({
  component: FixedExpensesPage,
})

function FixedExpensesPage() {
  const { data: templates, isLoading } = useFixedExpenseTemplates()
  const deleteTemplate = useDeleteFixedExpenseTemplate()

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this fixed expense template?')) {
      deleteTemplate.mutate(id)
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-heading text-3xl font-medium text-text-primary">Fixed Expenses</h2>
          <p className="text-text-secondary mt-1">Manage your recurring bills and subscriptions.</p>
        </div>
        <button className="btn-primary">
          <Plus className="w-5 h-5" />
          Add Fixed Expense
        </button>
      </header>

      {isLoading ? (
        <div className="card flex items-center justify-center h-64">
          <p className="text-text-secondary">Loading...</p>
        </div>
      ) : !templates || templates.length === 0 ? (
        <div className="card">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-sage/20 rounded-full flex items-center justify-center mb-4">
              <CalendarClock className="w-8 h-8 text-sage" />
            </div>
            <h3 className="font-heading text-xl font-semibold mb-2 text-text-primary">No fixed expenses yet</h3>
            <p className="text-text-secondary max-w-sm mb-6">Add your rent, utilities, subscriptions, and other recurring bills to ensure they are automatically accounted for.</p>
            <button className="btn-primary">
              <Plus className="w-5 h-5" />
              Add your first bill
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-sage/20 text-forest rounded-2xl">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div className="flex gap-1">
                  <button className="p-1.5 rounded-lg text-text-tertiary hover:text-forest hover:bg-sage/10 transition-colors">
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
              <p className="text-2xl font-semibold text-text-primary mb-2">${Number(template.amount).toFixed(2)}</p>
              <div className="flex items-center gap-2">
                <span className="badge-sage capitalize">{template.frequency}</span>
                {template.categoryName && (
                  <span className="badge-neutral">{template.categoryName}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
