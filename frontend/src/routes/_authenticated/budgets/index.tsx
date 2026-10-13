import { usePreferredTimezone } from '../../../hooks/useCurrency';
import { useAuth } from '../../../hooks/useAuth';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useBudget,
  useBudgetSummary,
  useActivateBudget,
} from '../../../hooks/useBudget';
import { api } from '../../../lib/api';
import { currentMonth, addMonths } from '../../../lib/month';
import { formatCurrency } from '../../../lib/currency';
import { getErrorMessage } from '../../../lib/errors';
import {
  MonthControl,
  MoveMoney,
  BUFFER,
} from '../../../components/budgets/PlanParts';
import { Modal } from '../../../components/ui/Modal';
import { FormField } from '../../../components/ui/FormField';
import type { BudgetSummary } from '../../../types';
export const Route = createFileRoute('/_authenticated/budgets/')({
  validateSearch: (s: Record<string, unknown>): { month?: string } => ({
    month:
      typeof s.month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s.month)
        ? s.month
        : undefined,
  }),
  component: PlanPage,
});
type Draft = {
  limit: string;
  revision: number;
  rows: Record<string, { amount: string; pacing: string }>;
};
function PlanPage() {
  const { user } = useAuth();
  const timezone = usePreferredTimezone();
  const { month: m } = Route.useSearch(),
    month = m ?? currentMonth(timezone),
    navigate = Route.useNavigate(),
    budget = useBudget(month),
    summary = useBudgetSummary(month, !!budget.data),
    create = useActivateBudget(month);
  return (
    <div className="space-y-5">
      <h1 className="page-title">Your monthly plan</h1>
      <MonthControl
        month={month}
        onChange={(month) => navigate({ search: { month } })}
      />
      {budget.isLoading ? (
        <p>Loading plan…</p>
      ) : budget.error ? (
        <p className="error">{getErrorMessage(budget.error)}</p>
      ) : !budget.data ? (
        <div className="notice">
          <p>
            No plan for this month. Start with a spending limit, then choose
            your buckets.
          </p>
          <button
            className="btn-primary mt-4"
            disabled={create.isPending}
            onClick={() => create.mutate()}
          >
            Create monthly plan
          </button>
          {create.error && (
            <p className="error mt-3">{getErrorMessage(create.error)}</p>
          )}
        </div>
      ) : summary.data && user ? (
        <PlanEditor
          key={`${user.id}:${month}`}
          userId={user.id}
          summary={summary.data}
        />
      ) : summary.error ? (
        <p className="error">{getErrorMessage(summary.error)}</p>
      ) : (
        <p>Loading allocations…</p>
      )}
    </div>
  );
}
function PlanEditor({
  summary: s,
  userId,
}: {
  summary: BudgetSummary;
  userId: string;
}) {
  const key = `plan-draft:${userId}:${s.month}`,
    qc = useQueryClient(),
    [draft, setDraft] = useState<Draft | null>(() => {
      try {
        return JSON.parse(localStorage.getItem(key) || 'null');
      } catch {
        return null;
      }
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [move, setMove] = useState<string | null>(null),
    [categoryOpen, setCategoryOpen] = useState(false),
    [categoryName, setCategoryName] = useState('');
  const base = (): Draft => ({
    limit: s.spendingLimit === null ? '' : String(s.spendingLimit),
    revision: s.revision,
    rows: Object.fromEntries(
      s.categories.map((c) => [
        c.id,
        { amount: String(c.assigned), pacing: c.pacing },
      ]),
    ),
  });
  const update = (next: Draft) => {
    setDraft(next);
    localStorage.setItem(key, JSON.stringify(next));
  };
  const editRow = (id: string, patch: Partial<Draft['rows'][string]>) => {
    const d = draft ?? base();
    update({ ...d, rows: { ...d.rows, [id]: { ...d.rows[id], ...patch } } });
  };
  const d = draft ?? base(),
    assigned = Object.values(d.rows).reduce(
      (sum, c) => sum + Number(c.amount || 0),
      0,
    ),
    buffer = Number(d.limit || 0) - assigned;
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await api.put(`/api/budgets/${s.month}/assignments`, {
        spendingLimit: Number(d.limit),
        revision: d.revision,
        assignments: Object.entries(d.rows).map(([categoryId, a]) => ({
          categoryId,
          assigned: Number(a.amount || 0),
          pacing: a.pacing,
        })),
      });
      setDraft(null);
      localStorage.removeItem(key);
      qc.invalidateQueries({ queryKey: ['budgets'] });
      qc.invalidateQueries({ queryKey: ['reviews'] });
    } catch (e) {
      setError(getErrorMessage(e));
      qc.invalidateQueries({ queryKey: ['budgets'] });
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    setBusy(true);
    setError('');
    try {
      const { data: previous } = await api.get<BudgetSummary>(
        `/api/budgets/${addMonths(s.month, -1)}/summary`,
      );
      if (previous.spendingLimit === null)
        throw new Error('Confirm the previous plan’s limit before copying.');
      update({
        limit: String(previous.spendingLimit),
        revision: s.revision,
        rows: Object.fromEntries(
          s.categories.map((c) => {
            const old = previous.categories.find((a) => a.id === c.id);
            return [
              c.id,
              {
                amount: String(old?.assigned ?? 0),
                pacing: old?.pacing ?? 'monthly',
              },
            ];
          }),
        ),
      });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      {s.excludedCurrencyCount > 0 && (
        <p className="notice mb-5">
          {s.excludedCurrencyCount} expenses use a different currency and are
          excluded from these balances. Review their currency and amounts in
          Activity.
        </p>
      )}
      {s.spendingLimit === null && (
        <p className="notice mb-5">
          Your existing allocations are preserved as monthly caps. Confirm a
          monthly spending limit to begin weekly pacing.
        </p>
      )}
      {draft && draft.revision !== s.revision && (
        <div className="notice mb-5">
          <p>
            Your spending or allocations changed since this draft. Review the
            current allocations below, then refresh the draft before saving.
            Your edits are kept.
          </p>
          <button
            className="btn-secondary mt-3"
            onClick={() => {
              update({ ...draft, revision: s.revision });
              setError('');
            }}
          >
            Refresh draft balances
          </button>
        </div>
      )}
      <FormField
        label={`Monthly spending limit (${s.currency})`}
        hint="Choose a spending limit independently of logged income."
      >
        <input
          className="field amount"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={d.limit}
          onChange={(e) => update({ ...d, limit: e.target.value })}
        />
      </FormField>
      <div className="flex flex-wrap gap-x-8 gap-y-3 py-5 border-b border-text-primary/15">
        <p className="text-sm">
          Allocated{' '}
          <strong className="block text-lg amount">
            {formatCurrency(assigned, s.currency)}
          </strong>
        </p>
        <div className="flex-1">
          <p className="text-sm">
            <Link
              to="/buckets/$bucketId"
              params={{ bucketId: BUFFER }}
              search={{ month: s.month }}
            >
              Buffer
            </Link>{' '}
            <strong
              className={`block text-lg amount ${buffer < 0 ? 'text-rust' : ''}`}
            >
              {formatCurrency(buffer, s.currency)}
            </strong>
          </p>
        </div>
        <button
          className="btn-secondary"
          disabled={!!draft || s.spendingLimit === null}
          onClick={() => setMove(BUFFER)}
        >
          Move money
        </button>
      </div>
      <p className="text-sm text-text-secondary py-4">
        Monthly-only buckets are reserved before flexible money is paced through
        the weeks. Weekly allowances carry within this month.
      </p>
      <button className="btn-secondary" disabled={busy} onClick={copy}>
        Copy previous plan
      </button>
      <div className="flex items-end justify-between gap-3">
        <h2 className="section-heading">Category buckets</h2>
        <button
          className="btn-secondary"
          disabled={!!draft}
          onClick={() => setCategoryOpen(true)}
        >
          Add category
        </button>
      </div>
      {s.categories.map((c) => (
        <div className="bucket-row" key={c.id}>
          <div className="flex justify-between items-start gap-4">
            <Link
              className="font-semibold min-h-11 inline-flex items-center py-2"
              to="/buckets/$bucketId"
              params={{ bucketId: c.id }}
              search={{ month: s.month }}
            >
              {c.name}
            </Link>
            <p className="text-sm amount text-right">
              {formatCurrency(c.activity, s.currency)} spent
              {draft && Number(d.rows[c.id]?.amount ?? 0) !== c.assigned && (
                <span className="block mt-1">
                  Current allocation: {formatCurrency(c.assigned, s.currency)}
                </span>
              )}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <FormField label={`${c.name} allocation`}>
              <input
                className="field amount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={d.rows[c.id]?.amount ?? '0'}
                onChange={(e) => editRow(c.id, { amount: e.target.value })}
              />
            </FormField>
            <FormField label={`${c.name} pacing`}>
              <select
                className="field"
                value={d.rows[c.id]?.pacing ?? 'monthly'}
                onChange={(e) => editRow(c.id, { pacing: e.target.value })}
              >
                <option value="monthly">Monthly only</option>
                <option value="weekly">Weekly paced</option>
              </select>
            </FormField>
          </div>
        </div>
      ))}
      {error && (
        <p className="error mt-4" role="alert">
          {error}
        </p>
      )}
      {(draft || s.spendingLimit === null) && (
        <div className="sticky bottom-36 bg-bg-base py-3 border-t border-text-primary/15 flex gap-3 flex-wrap mt-5">
          <button
            className="btn-primary"
            disabled={
              busy ||
              d.limit === '' ||
              buffer < 0 ||
              (!!draft && draft.revision !== s.revision)
            }
            onClick={save}
          >
            {busy
              ? 'Saving…'
              : s.spendingLimit === null
                ? 'Confirm limit and save'
                : 'Save plan'}
          </button>
          {draft && (
            <button
              className="btn-secondary"
              onClick={() => {
                if (
                  window.confirm('Discard your saved draft for this month?')
                ) {
                  setDraft(null);
                  localStorage.removeItem(key);
                }
              }}
            >
              Discard draft
            </button>
          )}
          <p className="text-sm text-text-secondary w-full">
            Draft saved on this device. Changing months keeps your edits.
          </p>
        </div>
      )}
      <Modal
        open={categoryOpen}
        onClose={() => setCategoryOpen(false)}
        title="Add category"
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              await api.post('/api/categories', {
                name: categoryName,
                kind: 'expense',
              });
              setCategoryOpen(false);
              setCategoryName('');
              qc.invalidateQueries({ queryKey: ['categories'] });
              qc.invalidateQueries({ queryKey: ['budgets'] });
            } catch (e) {
              setError(getErrorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <FormField label="Category name">
            <input
              className="field"
              required
              maxLength={100}
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
            />
          </FormField>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="btn-primary" disabled={busy}>
            Create category
          </button>
        </form>
      </Modal>
      {move && (
        <MoveMoney summary={s} sourceId={move} onClose={() => setMove(null)} />
      )}
    </div>
  );
}
