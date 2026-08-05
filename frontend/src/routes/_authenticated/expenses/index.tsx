import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Receipt, Plus, Search, Trash2 } from 'lucide-react'
import { useExpenses, useCreateExpense, useDeleteExpense } from '../../../hooks/useExpenses'

export const Route = createFileRoute('/_authenticated/expenses/')({
  component: ExpensesPage,
})

function ExpensesPage() {
  const [search, setSearch] = useState('')
  const { data: expenses, isLoading } = useExpenses()
  const createExpense = useCreateExpense()
  const deleteExpense = useDeleteExpense()

  const filteredExpenses = search
    ? expenses?.filter((e) =>
        e.description?.toLowerCase().includes(search.toLowerCase()),
      )
    : expenses

  const handleQuickAdd = () => {
    createExpense.mutate({
      amount: 0,
      description: 'New expense',
      date: new Date().toISOString(),
    } as never)
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-heading text-3xl font-medium text-text-primary">Expenses</h2>
          <p className="text-text-secondary mt-1">Track and manage your daily spending.</p>
        </div>
        <button className="btn-primary" onClick={handleQuickAdd}>
          <Plus className="w-5 h-5" />
          Log Expense
        </button>
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
      ) : !filteredExpenses || filteredExpenses.length === 0 ? (
        <div className="card">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-sage/20 rounded-full flex items-center justify-center mb-4">
              <Receipt className="w-8 h-8 text-sage" />
            </div>
            <h3 className="font-heading text-xl font-semibold mb-2 text-text-primary">No expenses recorded</h3>
            <p className="text-text-secondary max-w-sm mb-6">You haven't logged any expenses yet. Start tracking your spending to stay on top of your budget.</p>
            <button className="btn-primary" onClick={handleQuickAdd}>
              <Plus className="w-5 h-5" />
              Log your first expense
            </button>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="divide-y divide-text-primary/6">
            {filteredExpenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between p-4 hover:bg-text-primary/3 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sage/20 flex items-center justify-center text-forest text-sm font-medium">
                    {expense.description?.charAt(0).toUpperCase() || 'E'}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-text-primary">{expense.description || 'Expense'}</p>
                    <p className="text-xs text-text-tertiary">{new Date(expense.date ?? '').toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-medium text-sm text-text-primary">-${Number(expense.amount).toFixed(2)}</p>
                  <button
                    onClick={() => deleteExpense.mutate(expense.id)}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-rust hover:bg-rust/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
