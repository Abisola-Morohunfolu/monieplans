import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { Wallet, Receipt, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { to: '/budgets', label: 'Budget', icon: Wallet },
  { to: '/transactions', label: 'Transactions', icon: Receipt },
  { to: '/profile', label: 'Settings', icon: Settings },
]

export function AppLayout() {
  const routerState = useRouterState()
  const { user, signOut } = useAuth()

  const isActive = (to: string) => routerState.location.pathname.startsWith(to)

  return (
    <div className="flex flex-col md:flex-row min-h-dvh md:h-screen md:overflow-hidden bg-bg-base text-text-primary">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 glass z-10 relative shrink-0">
        <div className="p-6">
          <Link to="/budgets" className="flex items-center gap-2 no-underline">
            <div className="w-8 h-8 rounded-xl bg-forest flex items-center justify-center text-white text-sm font-bold">
              M
            </div>
            <span className="font-heading text-2xl font-semibold text-text-primary">Monieplans</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
                  active
                    ? 'bg-sage/20 text-forest font-medium shadow-[0_0_20px_rgba(142,156,117,0.15)]'
                    : 'text-text-secondary hover:bg-text-primary/5 hover:text-text-primary'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-forest' : 'text-text-tertiary'}`} />
                <span className="text-sm">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 mt-auto space-y-1.5">
          {user && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl">
              <div className="w-9 h-9 rounded-full bg-forest text-bg-base flex items-center justify-center text-sm font-semibold shrink-0">
                {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'M'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {user.name || user.email}
                </p>
                <p className="text-xs text-text-tertiary truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-2xl text-text-secondary hover:bg-rust/10 hover:text-rust transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-20 glass border-b border-text-primary/8">
          <div className="flex items-center justify-between px-4 py-3">
            <Link to="/budgets" className="flex items-center gap-2 no-underline">
              <div className="w-7 h-7 rounded-lg bg-forest flex items-center justify-center text-white text-xs font-bold">
                M
              </div>
              <span className="font-heading text-lg font-semibold text-text-primary">Monieplans</span>
            </Link>
            {user && (
              <div className="w-8 h-8 rounded-full bg-forest text-bg-base flex items-center justify-center text-sm font-semibold">
                {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'M'}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 pb-28 sm:p-6 lg:p-8 max-w-5xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 glass border-t border-text-primary/8"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-stretch justify-around">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-1 py-2.5 px-3 min-w-[64px] text-[11px] font-medium transition-colors ${
                  active ? 'text-forest' : 'text-text-tertiary'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-forest' : ''}`} />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
