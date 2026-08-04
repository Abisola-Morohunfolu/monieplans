import { createFileRoute } from '@tanstack/react-router'
import { Target, Plus } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/goals/')({
  component: GoalsPage,
})

function GoalsPage() {
  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold">Financial Goals</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Set, track, and achieve your saving objectives.</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Create Goal
        </button>
      </header>

      <div className="glass-card">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <Target className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold mb-2">No active goals</h3>
          <p className="text-slate-500 max-w-sm mb-6">Whether it's an emergency fund, a vacation, or a new gadget, start saving towards your dreams.</p>
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Set your first goal
          </button>
        </div>
      </div>
    </div>
  )
}
