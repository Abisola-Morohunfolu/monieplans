import { usePreferredTimezone } from '../../hooks/useCurrency';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { currentMonth } from '../../lib/month';
import { formatCurrency } from '../../lib/currency';
import { getErrorMessage } from '../../lib/errors';
import { MonthControl } from '../../components/budgets/PlanParts';
import { Modal } from '../../components/ui/Modal';
import type { BudgetSummary, CategorySummary, Movement } from '../../types';
interface Review {
  excludedCurrencyCount: number;
  uncategorized: number;
  month: string;
  currency: string;
  spendingLimit: number | null;
  monthToDate: boolean;
  totals: BudgetSummary['totals'];
  categories: CategorySummary[];
  movements: Movement[];
  weekly: {
    start: string;
    end: string;
    spent: number;
    planned: number;
    flexibleSpent: number;
  }[];
  aiAvailable: boolean;
  recommendation: {
    id: string;
    explanation: string;
    stale: boolean;
    appliedAt: string | null;
    assignments: { categoryId: string; assigned: number; pacing: string }[];
    spendingLimit: number;
  } | null;
}
interface Preview {
  month: string;
  revision: number;
  spendingLimit: number;
  existing: BudgetSummary | null;
  assignments: { categoryId: string; assigned: number; pacing: string }[];
  applied: boolean;
}
export const Route = createFileRoute('/_authenticated/review')({
  component: ReviewPage,
});
function ReviewPage() {
  const timezone = usePreferredTimezone();
  const [selectedMonth, setMonth] = useState<string | null>(null);
  const month = selectedMonth ?? currentMonth(timezone);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [preview, setPreview] = useState<Preview | null>(null),
    qc = useQueryClient();
  const query = useQuery<Review>({
      queryKey: ['reviews', month],
      queryFn: async () => (await api.get(`/api/reviews/${month}`)).data,
      retry: false,
    }),
    r = query.data;
  const generate = async () => {
    setBusy(true);
    setError('');
    try {
      await api.post(`/api/reviews/${month}/generate`);
      qc.invalidateQueries({ queryKey: ['reviews', month] });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const proposal = async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(
        `/api/reviews/${month}/proposals/${r!.recommendation!.id}/preview`,
      );
      setPreview(data);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <h1 className="page-title">Monthly review</h1>
      <div className="my-5">
        <MonthControl
          month={month}
          onChange={(m) => {
            setMonth(m);
            setError('');
            setPreview(null);
          }}
        />
      </div>
      {query.isLoading ? (
        <p>Loading breakdown…</p>
      ) : query.error ? (
        <p className="notice">
          {getErrorMessage(query.error)}. Create a plan for this month to see
          its review.
        </p>
      ) : (
        r && (
          <>
            <p className="text-text-secondary">
              {r.monthToDate
                ? 'Month-to-date · this month is incomplete'
                : 'Completed month'}{' '}
              · {month}
            </p>
            {r.excludedCurrencyCount > 0 && (
              <p className="notice mt-5">
                {r.excludedCurrencyCount} expenses in other currencies are
                excluded. Review them in Activity; amounts are never added
                across currencies.
              </p>
            )}
            <div className="balance">
              <p>Total spent</p>
              <p className="value amount">
                {formatCurrency(r.totals.totalExpense, r.currency)}
              </p>
              <p className="text-text-secondary amount">
                Monthly limit:{' '}
                {r.spendingLimit === null
                  ? 'Awaiting confirmation'
                  : formatCurrency(r.spendingLimit, r.currency)}
              </p>
            </div>
            <h2 className="section-heading">Category breakdown</h2>
            <p className="text-sm text-text-secondary">
              Original targets stay visible even when you top up a bucket.
            </p>
            {r.categories
              .filter((b) => b.assigned || b.activity || b.originalTarget)
              .map((b) => (
                <div className="bucket-row" key={b.id}>
                  <div className="flex justify-between gap-4">
                    <p className="font-semibold">{b.name}</p>
                    <p className="font-semibold amount">
                      {formatCurrency(b.activity, r.currency)}
                    </p>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-sm mt-2">
                    <div>
                      <dt className="text-text-secondary">Original target</dt>
                      <dd className="amount">
                        {formatCurrency(b.originalTarget, r.currency)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-text-secondary">
                        Current allocation
                      </dt>
                      <dd className="amount">
                        {formatCurrency(b.assigned, r.currency)}
                      </dd>
                    </div>
                  </dl>
                  {b.activity > b.originalTarget && (
                    <p className="text-sm text-rust mt-2 amount">
                      {formatCurrency(
                        b.activity - b.originalTarget,
                        r.currency,
                      )}{' '}
                      above original target
                    </p>
                  )}
                </div>
              ))}
            {r.categories.every((b) => !b.activity && !b.assigned) && (
              <p className="text-text-secondary py-4">
                No category spending or allocations yet.
              </p>
            )}
            {r.uncategorized > 0 && (
              <p className="bucket-row amount">
                Uncategorized spending:{' '}
                {formatCurrency(r.uncategorized, r.currency)}
              </p>
            )}
            <h2 className="section-heading">Weekly breakdown</h2>
            {r.weekly.map((w) => (
              <div className="bucket-row" key={w.start}>
                <div className="flex justify-between gap-3">
                  <p>
                    {w.start.slice(5)} – {w.end.slice(5)}
                  </p>
                  <p className="font-semibold amount">
                    {formatCurrency(w.spent, r.currency)}
                  </p>
                </div>
                <p className="text-sm text-text-secondary mt-2 amount">
                  Flexible spending{' '}
                  {formatCurrency(w.flexibleSpent, r.currency)} · Flexible plan{' '}
                  {formatCurrency(w.planned, r.currency)}
                </p>
              </div>
            ))}
            <h2 className="section-heading">Reallocations</h2>
            {r.movements.length === 0 ? (
              <p className="text-text-secondary text-sm">
                No money moved this month.
              </p>
            ) : (
              r.movements.map((v) => (
                <p className="bucket-row text-sm amount" key={v.id}>
                  {r.categories.find((c) => c.id === v.source_id)?.name ??
                    'Buffer'}{' '}
                  →{' '}
                  {r.categories.find((c) => c.id === v.destination_id)?.name ??
                    'Buffer'}{' '}
                  · {formatCurrency(v.amount_cents / 100, r.currency)}
                </p>
              ))
            )}
            <h2 className="section-heading">Optional AI recommendations</h2>
            <p className="text-sm text-text-secondary">
              Generate an explanation and next-month allocations from this
              breakdown. You review any changes before applying them.
            </p>
            <button
              className="btn-secondary my-4"
              disabled={busy || !r.aiAvailable || r.spendingLimit === null}
              onClick={generate}
            >
              {busy
                ? 'Working…'
                : r.recommendation
                  ? 'Regenerate recommendations'
                  : 'Generate recommendations'}
            </button>
            {!r.aiAvailable && (
              <p className="notice">
                AI reviews are unavailable until the AI binding is configured.
              </p>
            )}
            {r.recommendation && (
              <div className="space-y-4">
                {r.recommendation.stale && (
                  <p className="notice">
                    This recommendation is stale because the spending summary
                    changed. Regenerate it before applying.
                  </p>
                )}
                <p className="whitespace-pre-wrap leading-relaxed">
                  {r.recommendation.explanation}
                </p>
                <button
                  className="btn-primary"
                  disabled={
                    busy ||
                    r.recommendation.stale ||
                    !!r.recommendation.appliedAt
                  }
                  onClick={proposal}
                >
                  {r.recommendation.appliedAt
                    ? 'Applied to next month'
                    : 'Preview next-month plan'}
                </button>
              </div>
            )}
          </>
        )
      )}
      {error && (
        <p className="error my-4" role="alert">
          {error}
        </p>
      )}
      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title="Preview next-month plan"
      >
        {preview && r && (
          <div className="space-y-4">
            <p className="notice">
              {preview.month} ·{' '}
              {preview.existing
                ? 'This replaces the current allocations in your existing plan. Original targets remain visible.'
                : 'This creates a new monthly plan.'}
            </p>
            <p className="amount">
              Monthly limit: {formatCurrency(preview.spendingLimit, r.currency)}
            </p>
            {preview.assignments
              .filter(
                (a) =>
                  a.assigned ||
                  preview.existing?.categories.find(
                    (b) => b.id === a.categoryId,
                  )?.assigned,
              )
              .map((a) => (
                <div className="bucket-row" key={a.categoryId}>
                  <p className="font-semibold">
                    {r.categories.find((b) => b.id === a.categoryId)?.name}
                  </p>
                  <p className="text-sm amount">
                    {formatCurrency(
                      preview.existing?.categories.find(
                        (b) => b.id === a.categoryId,
                      )?.assigned ?? 0,
                      r.currency,
                    )}{' '}
                    → {formatCurrency(a.assigned, r.currency)} · {a.pacing}
                  </p>
                </div>
              ))}
            <button
              className="btn-primary w-full"
              disabled={busy || preview.applied}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  await api.post(
                    `/api/reviews/${month}/proposals/${r.recommendation!.id}/apply`,
                    { revision: preview.revision },
                  );
                  setPreview(null);
                  qc.invalidateQueries({ queryKey: ['reviews'] });
                  qc.invalidateQueries({ queryKey: ['budgets'] });
                } catch (e) {
                  setError(getErrorMessage(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirm plan changes
            </button>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
