import { createFileRoute } from '@tanstack/react-router'
import { Wallet, TrendingUp, AlertCircle } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold">Dashboard</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Welcome back, here's your financial overview.</p>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-primary-light rounded-xl text-primary">
              <Wallet className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-emerald-500 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              +2.5%
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Active Budget Balance</p>
          <h3 className="text-3xl font-bold mt-1">$4,250.00</h3>
        </div>

        <div className="glass-card">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Expenses</p>
          <h3 className="text-3xl font-bold mt-1">$1,120.00</h3>
        </div>

        <div className="glass-card">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">AI Recommendations</p>
          <h3 className="text-3xl font-bold mt-1">2 New</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 glass-card h-96 flex items-center justify-center">
          <p className="text-slate-400">Spending Chart Placeholder</p>
        </div>

        {/* Recent Transactions */}
        <div className="glass-card">
          <h3 className="text-lg font-bold mb-4">Recent Transactions</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    🍔
                  </div>
                  <div>
                    <p className="font-medium">Lunch</p>
                    <p className="text-xs text-slate-500">Today, 12:30 PM</p>
                  </div>
                </div>
                <p className="font-medium text-slate-900 dark:text-slate-100">-$24.50</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
