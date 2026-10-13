import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ArrowRightLeft } from 'lucide-react';
import { addMonths, monthLabel } from '../../lib/month';
import { formatCurrency } from '../../lib/currency';
import { api } from '../../lib/api';
import { getErrorMessage } from '../../lib/errors';
import { Modal } from '../ui/Modal';
import { FormField } from '../ui/FormField';
import type { BudgetSummary, WeekSummary } from '../../types';
export const BUFFER = '__buffer__';
export function MonthControl({
  month,
  onChange,
}: {
  month: string;
  onChange: (month: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        className="icon-button"
        aria-label="Previous month"
        onClick={() => onChange(addMonths(month, -1))}
      >
        <ChevronLeft size={20} />
      </button>
      <span className="font-semibold text-center">{monthLabel(month)}</span>
      <button
        className="icon-button"
        aria-label="Next month"
        onClick={() => onChange(addMonths(month, 1))}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
export function BucketRows({
  summary,
  attention = false,
}: {
  summary: BudgetSummary;
  attention?: boolean;
}) {
  const rows = attention
    ? summary.categories.filter((b) => b.warning)
    : summary.categories.filter((b) => b.assigned > 0 || b.activity > 0);
  return (
    <div>
      {rows.length === 0 && (
        <p className="text-text-secondary py-4">
          {attention
            ? 'Your buckets are on track.'
            : 'Set category allocations in Plan to create your buckets.'}
        </p>
      )}
      {rows.map((b) => (
        <Link
          to="/buckets/$bucketId"
          params={{ bucketId: b.id }}
          search={{ month: summary.month }}
          key={b.id}
          className="bucket-row block"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold break-words">{b.name}</p>
              <p className="text-sm text-text-secondary mt-1">
                {b.pacing === 'weekly' ? 'Weekly pacing' : 'Monthly only'}
                {b.warning
                  ? ` · ${b.warning === '80%' ? '80% used' : b.warning}`
                  : ''}
              </p>
            </div>
            <p
              className={`amount font-semibold text-right ${b.available < 0 ? 'text-rust' : ''}`}
            >
              {formatCurrency(b.available, summary.currency)}
              <span className="block text-sm font-normal text-text-secondary">
                available
              </span>
            </p>
          </div>
          <div className="h-1.5 bg-bg-alt rounded mt-3 overflow-hidden">
            <div
              className={`${b.warning ? 'bg-rust' : 'bg-forest'} h-full`}
              style={{
                width: `${Math.min(100, b.assigned > 0 ? (b.activity / b.assigned) * 100 : 100)}%`,
              }}
            />
          </div>
          <p className="text-sm text-text-secondary mt-2 amount">
            {formatCurrency(b.activity, summary.currency)} spent of{' '}
            {formatCurrency(b.assigned, summary.currency)}
          </p>
        </Link>
      ))}
    </div>
  );
}
export function WeekRows({
  weeks,
  currency,
  bucketId,
}: {
  weeks: WeekSummary[];
  currency: string;
  bucketId?: string;
}) {
  return (
    <div>
      {weeks.map((w) => {
        const b = w.buckets.find((b) => b.bucketId === bucketId);
        return (
          <div className="bucket-row" key={w.start}>
            <div className="flex justify-between gap-3">
              <p>
                {w.start.slice(5)} – {w.end.slice(5)}
                {w.current ? ' · current' : ''}
              </p>
              <p className="amount font-semibold">
                {formatCurrency(
                  (b?.availableCents ?? w.availableCents) / 100,
                  currency,
                )}
              </p>
            </div>
            <p className="text-sm text-text-secondary mt-1 amount">
              Planned{' '}
              {formatCurrency(
                (b ? b.plannedCents + b.adjustmentCents : w.plannedCents) / 100,
                currency,
              )}{' '}
              · Spent{' '}
              {formatCurrency((b?.spentCents ?? w.spentCents) / 100, currency)}
              {b
                ? ` · Carried ${formatCurrency(b.carryCents / 100, currency)}`
                : ''}
            </p>
          </div>
        );
      })}
    </div>
  );
}
export function MoveMoney({
  summary,
  sourceId,
  onClose,
}: {
  summary: BudgetSummary;
  sourceId: string;
  onClose: () => void;
}) {
  const [destination, setDestination] = useState(
      sourceId === BUFFER ? (summary.categories[0]?.id ?? '') : BUFFER,
    ),
    [amount, setAmount] = useState(''),
    [preview, setPreview] = useState<{
      sourceAvailableCents: number;
      destinationAvailableCents: number;
      weeks: WeekSummary[];
    } | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [id] = useState(crypto.randomUUID()),
    qc = useQueryClient();
  const name = (id: string) =>
    id === BUFFER
      ? 'Buffer'
      : (summary.categories.find((c) => c.id === id)?.name ?? id);
  const payload = {
    id,
    sourceId,
    destinationId: destination,
    amount: Number(amount),
    revision: summary.revision,
  };
  const available =
    sourceId === BUFFER
      ? summary.buffer.available
      : (summary.categories.find((c) => c.id === sourceId)?.available ?? 0);
  const action = async (save: boolean) => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(
        `/api/budgets/${summary.month}/moves${save ? '' : '/preview'}`,
        payload,
      );
      if (save) {
        qc.invalidateQueries({ queryKey: ['budgets'] });
        qc.invalidateQueries({ queryKey: ['reviews'] });
        onClose();
      } else setPreview(data);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} title={`Move money from ${name(sourceId)}`}>
      <div className="space-y-4">
        <p className="text-text-secondary amount">
          {formatCurrency(available, summary.currency)} unused. Your monthly
          limit stays the same.
        </p>
        <FormField label="Destination">
          <select
            className="field"
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              setPreview(null);
            }}
          >
            {[{ id: BUFFER, name: 'Buffer' }, ...summary.categories]
              .filter((b) => b.id !== sourceId)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
        </FormField>
        <FormField label="Amount to move">
          <input
            className="field amount"
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setPreview(null);
            }}
          />
        </FormField>
        {preview && (
          <div>
            <p className="notice amount">
              {name(sourceId)}:{' '}
              {formatCurrency(
                preview.sourceAvailableCents / 100,
                summary.currency,
              )}{' '}
              available
              <br />
              {name(destination)}:{' '}
              {formatCurrency(
                preview.destinationAvailableCents / 100,
                summary.currency,
              )}{' '}
              available
            </p>
            <h3 className="section-heading">Revised weekly plan</h3>
            <WeekRows weeks={preview.weeks} currency={summary.currency} />
          </div>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button
          className="btn-primary w-full"
          disabled={busy || !Number(amount) || !destination}
          onClick={() => action(!!preview)}
        >
          <ArrowRightLeft size={18} />
          {busy ? 'Working…' : preview ? 'Confirm move' : 'Preview move'}
        </button>
      </div>
    </Modal>
  );
}
