import { createFileRoute } from '@tanstack/react-router'
import { CalendarClock, Plus } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/fixed-expenses/')({
  component: FixedExpensesPage,
})

function FixedExpensesPage() {
  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold">Fixed Expenses</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your recurring bills and subscriptions.</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Fixed Expense
        </button>
      </header>

      <div className="glass-card">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <CalendarClock className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold mb-2">No fixed expenses yet</h3>
          <p className="text-slate-500 max-w-sm mb-6">Add your rent, utilities, subscriptions, and other recurring bills to ensure they are automatically accounted for.</p>
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add your first bill
          </button>
        </div>
      </div>
    </div>
  )
}
