import { createFileRoute } from '@tanstack/react-router'
import { Receipt, Plus, Search, Filter } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/expenses/')({
  component: ExpensesPage,
})

function ExpensesPage() {
  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold">Expenses</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Track and manage your daily spending.</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Log Expense
        </button>
      </header>

      <div className="glass-card flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search expenses..." 
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
          <Filter className="w-5 h-5" />
          Filter
        </button>
      </div>

      <div className="glass-card">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <Receipt className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold mb-2">No expenses recorded</h3>
          <p className="text-slate-500 max-w-sm mb-6">You haven't logged any expenses yet. Start tracking your spending to stay on top of your budget.</p>
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Log your first expense
          </button>
        </div>
      </div>
    </div>
  )
}
