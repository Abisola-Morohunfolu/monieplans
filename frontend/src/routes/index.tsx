import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base dark:bg-dark-1 p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sage/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-forest/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-rust/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="card text-center max-w-lg w-full relative z-10 p-10">
        <h1 className="font-heading text-5xl md:text-6xl font-medium mb-4 text-text-primary leading-tight tracking-tight">
          Monieplans
        </h1>
        <p className="text-lg text-text-secondary mb-8 leading-relaxed">
          Your personal finance copilot. Manage budgets, track expenses, and reach your goals.
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/login" className="btn-primary">
            Get Started
          </Link>
          <Link to="/login" className="btn-secondary">
            Login
          </Link>
        </div>
      </div>
    </div>
  )
}
