import { usePreferredTimezone } from '../../hooks/useCurrency';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useBudget, useBudgetSummary } from '../../hooks/useBudget';
import { useTransactions } from '../../hooks/useTransactions';
import { currentMonth } from '../../lib/month';
import { formatCurrency } from '../../lib/currency';
import { getErrorMessage } from '../../lib/errors';
import { BucketRows } from '../../components/budgets/PlanParts';
import { TransactionRows } from '../../components/transactions/TransactionRows';
export const Route = createFileRoute('/_authenticated/dashboard')({
  component: HomePage,
});
function HomePage() {
  const timezone = usePreferredTimezone();
  const month = currentMonth(timezone),
    budget = useBudget(month),
    summary = useBudgetSummary(month, !!budget.data),
    recent = useTransactions({ month, limit: 5 });
  const s = summary.data;
  return (
    <div>
      <h1 className="page-title">This week, in reach.</h1>
      {budget.isLoading || summary.isLoading ? (
        <p className="py-8">Loading your plan…</p>
      ) : budget.error || summary.error ? (
        <p className="error py-6">
          {getErrorMessage(budget.error ?? summary.error)}
        </p>
      ) : !s ? (
        <div className="notice mt-6">
          <p>Set a monthly limit and give your spending a weekly rhythm.</p>
          <Link to="/budgets" className="btn-primary mt-4">
            Create your plan
          </Link>
        </div>
      ) : (
        <>
          {s.excludedCurrencyCount > 0 && (
            <p className="notice mt-5">
              Expenses in a different currency are excluded from this plan.
              Review them in Activity.
            </p>
          )}
          <div className="balance">
            <p className="text-text-secondary">
              {s.currentWeek.start.slice(5)} – {s.currentWeek.end.slice(5)} ·
              weekly available
            </p>
            <p
              className={`value amount ${(s.weeklyAvailable ?? 0) < 0 ? 'text-rust' : ''}`}
            >
              {s.weeklyAvailable === null
                ? 'Confirm your limit'
                : formatCurrency(s.weeklyAvailable, s.currency)}
            </p>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <p className="text-sm text-text-secondary">
                Monthly remaining{' '}
                <strong className="block text-text-primary text-lg amount">
                  {s.spendingLimit === null
                    ? '—'
                    : formatCurrency(s.totals.remaining, s.currency)}
                </strong>
              </p>
              <p className="text-sm text-text-secondary">
                Buffer available{' '}
                <strong className="block text-text-primary text-lg amount">
                  {formatCurrency(s.buffer.available, s.currency)}
                </strong>
              </p>
            </div>
          </div>
          {s.spendingLimit === null && (
            <Link to="/budgets" className="btn-secondary mt-4">
              Confirm monthly limit
            </Link>
          )}
          <h2 className="section-heading">Needs attention</h2>
          <BucketRows summary={s} attention />
          <h2 className="section-heading">Your buckets</h2>
          <BucketRows summary={s} />
        </>
      )}
      <div className="flex justify-between items-center">
        <h2 className="section-heading">Recent activity</h2>
        <Link to="/transactions" className="text-sm py-3">
          View all
        </Link>
      </div>
      {recent.error ? (
        <p className="error">{getErrorMessage(recent.error)}</p>
      ) : (
        <TransactionRows transactions={recent.data?.data ?? []} />
      )}
    </div>
  );
}
