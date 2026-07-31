import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[80vh]">
      <div className="glass-card text-center max-w-lg w-full">
        <h1 className="text-4xl font-bold mb-4 text-primary">Monieplans</h1>
        <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
          Your personal finance copilot. Manage budgets, track expenses, and reach your goals.
        </p>
        <div className="flex gap-4 justify-center">
          <button className="px-6 py-2 bg-[#aa3bff] text-white rounded-lg font-medium hover:bg-[#922ce0] transition-colors">
            Get Started
          </button>
          <button className="px-6 py-2 bg-slate-200 dark:bg-slate-800 rounded-lg font-medium hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
            Login
          </button>
        </div>
      </div>
    </div>
  )
}
