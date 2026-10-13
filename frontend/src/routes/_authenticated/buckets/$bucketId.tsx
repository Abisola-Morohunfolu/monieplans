import { usePreferredTimezone } from '../../../hooks/useCurrency';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBudgetSummary } from '../../../hooks/useBudget';
import { useTransactions } from '../../../hooks/useTransactions';
import { useExpense } from '../../../components/transactions/ExpenseFlow';
import { TransactionRows } from '../../../components/transactions/TransactionRows';
import {
  MoveMoney,
  WeekRows,
  BUFFER,
} from '../../../components/budgets/PlanParts';
import { currentMonth } from '../../../lib/month';
import { formatCurrency } from '../../../lib/currency';
import { api } from '../../../lib/api';
import { getErrorMessage } from '../../../lib/errors';
import type { BudgetSummary, CategorySummary } from '../../../types';
export const Route = createFileRoute('/_authenticated/buckets/$bucketId')({
  validateSearch: (s: Record<string, unknown>): { month?: string } => ({
    month: typeof s.month === 'string' ? s.month : undefined,
  }),
  component: BucketPage,
});
function BucketPage() {
  const timezone = usePreferredTimezone();
  const { bucketId } = Route.useParams(),
    { month: m } = Route.useSearch(),
    month = m ?? currentMonth(timezone),
    query = useBudgetSummary(month),
    expense = useExpense(),
    [move, setMove] = useState(false),
    recent = useTransactions({
      month,
      categoryId: bucketId,
      type: 'expense',
      limit: 8,
    }),
    s = query.data,
    b =
      bucketId === BUFFER && s
        ? ({
            id: BUFFER,
            name: 'Buffer',
            pacing: 'weekly',
            assigned: s.buffer.assigned,
            available: s.buffer.available,
            activity: s.buffer.assigned - s.buffer.available,
            originalTarget: s.buffer.assigned,
            warning: s.buffer.available < 0 ? 'exceeded' : null,
          } as CategorySummary)
        : s?.categories.find((c) => c.id === bucketId);
  if (query.isLoading) return <p>Loading bucket…</p>;
  if (!s || !b)
    return (
      <p className="error">
        {query.error ? getErrorMessage(query.error) : 'Bucket not found.'}
      </p>
    );
  return (
    <div>
      <Link
        to="/budgets"
        search={{ month }}
        className="inline-block py-3 text-sm"
      >
        Back to Plan
      </Link>
      <h1 className="page-title">{b.name}</h1>
      <p className="text-text-secondary mt-2">
        {b.pacing === 'weekly' ? 'Weekly paced' : 'Monthly only'} · {month}
      </p>
      <div className="balance">
        <p>Available</p>
        <p className={`value amount ${b.available < 0 ? 'text-rust' : ''}`}>
          {formatCurrency(b.available, s.currency)}
        </p>
        <dl className="grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
          <div>
            <dt className="text-text-secondary">
              {b.id === BUFFER ? 'Unallocated reserve' : 'Original target'}
            </dt>
            <dd className="font-semibold amount">
              {formatCurrency(b.originalTarget, s.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-text-secondary">Current allocation</dt>
            <dd className="font-semibold amount">
              {formatCurrency(b.assigned, s.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-text-secondary">Spent</dt>
            <dd className="font-semibold amount">
              {formatCurrency(b.activity, s.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-text-secondary">Status</dt>
            <dd>{b.warning ?? 'Within allocation'}</dd>
          </div>
        </dl>
      </div>
      <div className="flex gap-3 flex-wrap mt-5">
        <button
          className="btn-primary"
          onClick={() =>
            expense({
              categoryId: b.id === BUFFER ? null : b.id,
              currency: s.currency,
              month,
            })
          }
        >
          Add expense
        </button>
        <button
          className="btn-secondary"
          disabled={s.spendingLimit === null}
          onClick={() => setMove(true)}
        >
          Move money
        </button>
      </div>
      {b.pacing === 'weekly' && (
        <>
          <h2 className="section-heading">Weekly view</h2>
          <WeekRows weeks={s.weeks} currency={s.currency} bucketId={b.id} />
          {b.id !== BUFFER && (
            <WeeklyEditor
              key={`${b.id}:${s.revision}`}
              summary={s}
              bucketId={b.id}
            />
          )}
        </>
      )}
      <h2 className="section-heading">Recent expenses</h2>
      <TransactionRows transactions={recent.data?.data ?? []} />
      <h2 className="section-heading">Money movement history</h2>
      {s.movements
        .filter((v) => v.source_id === b.id || v.destination_id === b.id)
        .map((v) => (
          <div className="bucket-row text-sm" key={v.id}>
            <p>
              {v.source_id === b.id ? 'To' : 'From'}{' '}
              {s.categories.find(
                (c) =>
                  c.id ===
                  (v.source_id === b.id ? v.destination_id : v.source_id),
              )?.name ?? 'Buffer'}{' '}
              ·{' '}
              <span className="amount">
                {formatCurrency(v.amount_cents / 100, s.currency)}
              </span>
            </p>
            <p className="text-text-secondary mt-1">
              {new Date(v.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      {!s.movements.some(
        (v) => v.source_id === b.id || v.destination_id === b.id,
      ) && (
        <p className="text-sm text-text-secondary">
          No moves yet. Your original target remains visible after a move.
        </p>
      )}
      {move && (
        <MoveMoney
          summary={s}
          sourceId={b.id ?? BUFFER}
          onClose={() => setMove(false)}
        />
      )}
    </div>
  );
}
function WeeklyEditor({
  summary: s,
  bucketId,
}: {
  summary: BudgetSummary;
  bucketId: string;
}) {
  const [open, setOpen] = useState(false),
    [values, setValues] = useState(
      s.weeks.map((w) =>
        String(
          (w.buckets.find((b) => b.bucketId === bucketId)?.plannedCents ?? 0) /
            100,
        ),
      ),
    ),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    qc = useQueryClient(),
    b = s.categories.find((b) => b.id === bucketId)!;
  return (
    <div className="mt-4">
      <button className="btn-secondary" onClick={() => setOpen(!open)}>
        {open ? 'Close weekly editor' : 'Edit weekly amounts'}
      </button>
      {open && (
        <form
          className="space-y-3 mt-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              await api.put(`/api/budgets/${s.month}/assignments`, {
                spendingLimit: s.spendingLimit,
                revision: s.revision,
                assignments: [
                  {
                    categoryId: bucketId,
                    assigned: b.assigned,
                    pacing: 'weekly',
                    weeks: s.weeks.map((w, i) => ({
                      weekStart: w.start,
                      amount: Number(values[i]),
                    })),
                  },
                ],
              });
              qc.invalidateQueries({ queryKey: ['budgets'] });
              qc.invalidateQueries({ queryKey: ['reviews'] });
              setOpen(false);
            } catch (e) {
              setError(getErrorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="text-sm text-text-secondary">
            Completed weeks are preserved. Weekly amounts plus signed move
            adjustments must total {formatCurrency(b.assigned, s.currency)}.
          </p>
          {s.weeks.map((w, i) => (
            <label
              className="flex gap-3 items-center justify-between text-sm"
              key={w.start}
            >
              <span>
                {w.start.slice(5)} – {w.end.slice(5)}
              </span>
              <input
                className="field amount max-w-36"
                aria-label={`Week starting ${w.start}`}
                type="number"
                step="0.01"
                min="0"
                disabled={w.start < s.currentWeek.start}
                value={values[i]}
                onChange={(e) =>
                  setValues(
                    values.map((v, j) => (i === j ? e.target.value : v)),
                  )
                }
              />
            </label>
          ))}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="btn-primary" disabled={busy}>
            Save weekly amounts
          </button>
        </form>
      )}
    </div>
  );
}
