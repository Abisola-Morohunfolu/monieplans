import { Link, Outlet, useRouterState, useNavigate } from '@tanstack/react-router'
import { LayoutDashboard, Wallet, Receipt, CalendarClock, Target, FileText, Settings, LogOut } from 'lucide-react'
import { signOut } from '../../lib/auth'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/budgets', label: 'Budgets', icon: Wallet },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/fixed-expenses', label: 'Fixed Expenses', icon: CalendarClock },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/statements', label: 'Statements', icon: FileText },
  { to: '/profile', label: 'Settings', icon: Settings },
]

export function AppLayout() {
  const routerState = useRouterState()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate({ to: '/login' })
  }

  return (
    <div className="flex h-screen bg-bg-base dark:bg-dark-1 text-text-primary overflow-hidden">
      <aside className="w-64 glass z-10 relative flex flex-col">
        <div className="p-6">
          <h1 className="font-heading text-2xl font-semibold text-text-primary flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-forest flex items-center justify-center text-white text-sm font-bold">
              M
            </div>
            Monieplans
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = routerState.location.pathname.startsWith(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
                  isActive
                    ? 'bg-sage/20 text-forest font-medium shadow-[0_0_20px_rgba(142,156,117,0.15)]'
                    : 'text-text-secondary hover:bg-text-primary/5 hover:text-text-primary'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-forest' : 'text-text-tertiary'}`} />
                <span className="text-sm">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-2xl text-text-secondary hover:bg-rust/10 hover:text-rust transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative">
        <div className="absolute inset-0 bg-gradient-to-br from-sage/5 via-transparent to-forest/3 pointer-events-none" />
        <div className="p-8 max-w-7xl mx-auto relative z-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
