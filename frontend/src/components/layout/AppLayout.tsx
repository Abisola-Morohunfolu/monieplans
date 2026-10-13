import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import {
  Home,
  Wallet,
  Receipt,
  ChartNoAxesColumn,
  Plus,
  UserRound,
} from 'lucide-react';
import { ExpenseProvider, useExpense } from '../transactions/ExpenseFlow';
const items = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/budgets', label: 'Plan', icon: Wallet },
  { to: '/transactions', label: 'Activity', icon: Receipt },
  { to: '/review', label: 'Review', icon: ChartNoAxesColumn },
] as const;
function Shell() {
  const path = useRouterState({ select: (s) => s.location.pathname }),
    expense = useExpense();
  return (
    <div className="app-shell">
      <header className="app-bar">
        <Link
          to="/dashboard"
          className="text-2xl font-semibold"
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
        >
          Monieplans
        </Link>
        <Link
          to="/profile"
          aria-label="Profile and settings"
          className="icon-button"
        >
          <UserRound size={22} />
        </Link>
      </header>
      <main className="app-content" id="main-content">
        <Outlet />
      </main>
      <button className="btn-primary add-expense" onClick={() => expense()}>
        <Plus size={20} />
        Add expense
      </button>
      <nav className="app-nav" aria-label="Main navigation">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            aria-current={path.startsWith(item.to) ? 'page' : undefined}
          >
            <item.icon size={21} />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
export function AppLayout() {
  return (
    <ExpenseProvider>
      <Shell />
    </ExpenseProvider>
  );
}
