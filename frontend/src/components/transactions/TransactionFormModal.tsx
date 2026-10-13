import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { FormField } from '../ui/FormField';
import { useCategories } from '../../hooks/useCategories';
import {
  useCreateTransaction,
  useUpdateTransaction,
} from '../../hooks/useTransactions';
import { getErrorMessage } from '../../lib/errors';
import { todayInput } from '../../lib/month';
import {
  usePreferredCurrency,
  usePreferredTimezone,
} from '../../hooks/useCurrency';
import type {
  Transaction,
  TransactionType,
  CreateTransactionInput,
} from '../../types';

export function ExpenseEditor({
  initial,
  defaultCategoryId,
  defaultType = 'expense',
  defaultDate,
  onSave,
  saveLabel = 'Save expense',
  draftKey,
  children,
}: {
  initial?: Partial<CreateTransactionInput>;
  defaultCategoryId?: string | null;
  defaultType?: TransactionType;
  defaultDate?: string;
  onSave: (data: CreateTransactionInput) => Promise<void>;
  saveLabel?: string;
  draftKey?: string;
  children?: React.ReactNode;
}) {
  const currency = usePreferredCurrency(),
    timezone = usePreferredTimezone();
  const cached = (() => {
    try {
      return draftKey
        ? JSON.parse(sessionStorage.getItem(draftKey) || 'null')
        : null;
    } catch {
      return null;
    }
  })();
  const [data, setData] = useState<CreateTransactionInput>(
    cached ?? {
      type: defaultType,
      amount: 0,
      occurredOn: defaultDate ?? todayInput(timezone),
      categoryId: defaultCategoryId ?? null,
      paymentStatus: 'completed',
      currency,
      id: crypto.randomUUID(),
      ...initial,
    },
  );
  const [amount, setAmount] = useState(data.amount ? String(data.amount) : ''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const { data: categories } = useCategories({ limit: 100 });
  const update = (patch: Partial<CreateTransactionInput>) => {
    const next = { ...data, ...patch };
    setData(next);
    if (draftKey) sessionStorage.setItem(draftKey, JSON.stringify(next));
  };
  const options = (kind: TransactionType) =>
    categories?.data.filter((c) => kind === 'transfer' || c.kind === kind) ??
    [];
  const categorySelect = (
    value: string | null | undefined,
    onChange: (v: string | null) => void,
    kind = data.type,
  ) => (
    <select
      className="field"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">Uncategorized</option>
      {options(kind).map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
  const splits = data.splits ?? [];
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!Number(amount) || Number(amount) <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    if (
      splits.length &&
      Math.round(splits.reduce((s, a) => s + a.amount, 0) * 100) !==
        Math.round(Number(amount) * 100)
    ) {
      setError('Splits must equal the expense total.');
      return;
    }
    setBusy(true);
    try {
      await onSave({ ...data, amount: Number(amount) });
      if (draftKey) sessionStorage.removeItem(draftKey);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <FormField label="Transaction type">
        <select
          className="field"
          value={data.type}
          onChange={(e) =>
            update({
              type: e.target.value as TransactionType,
              categoryId: null,
              splits: [],
            })
          }
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="transfer">Own-account transfer</option>
        </select>
      </FormField>
      {data.type === 'transfer' && (
        <p className="notice">
          Money between your own accounts is excluded from spending.
        </p>
      )}
      <FormField label="Amount">
        <input
          className="field amount"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          required
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            update({ amount: Number(e.target.value) });
          }}
        />
      </FormField>
      <FormField label="Currency">
        <input
          className="field"
          maxLength={3}
          value={data.currency ?? currency}
          onChange={(e) => update({ currency: e.target.value.toUpperCase() })}
        />
      </FormField>
      <FormField label="Category">
        {categorySelect(data.categoryId, (v) => update({ categoryId: v }))}
      </FormField>
      <div className="grid sm:grid-cols-2 gap-4">
        <FormField label="Date">
          <input
            className="field"
            type="date"
            required
            value={data.occurredOn}
            onChange={(e) => update({ occurredOn: e.target.value })}
          />
        </FormField>
        <FormField label="Merchant or recipient">
          <input
            className="field"
            value={data.payee ?? ''}
            maxLength={200}
            onChange={(e) => update({ payee: e.target.value })}
          />
        </FormField>
      </div>
      <FormField label="Payment status">
        <select
          className="field"
          value={data.paymentStatus ?? 'completed'}
          onChange={(e) =>
            update({
              paymentStatus: e.target
                .value as CreateTransactionInput['paymentStatus'],
            })
          }
        >
          <option value="completed">Completed</option>
          <option value="pending">Pending — excluded from spending</option>
          <option value="failed">Failed — excluded from spending</option>
        </select>
      </FormField>
      <FormField label="Note (optional)">
        <textarea
          className="field"
          rows={2}
          maxLength={1000}
          value={data.note ?? ''}
          onChange={(e) => update({ note: e.target.value })}
        />
      </FormField>
      {data.type === 'expense' && (
        <div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              update({
                splits: [
                  ...splits,
                  {
                    categoryId: data.categoryId ?? null,
                    amount: splits.length ? 0 : Number(amount),
                  },
                ],
              })
            }
          >
            Add category split
          </button>
          {splits.map((s, i) => (
            <div
              className="space-y-2 mt-3 border-t border-text-primary/15 pt-3"
              key={i}
            >
              <FormField label={`Split ${i + 1} category`}>
                {categorySelect(
                  s.categoryId,
                  (v) =>
                    update({
                      splits: splits.map((a, j) =>
                        i === j ? { ...a, categoryId: v } : a,
                      ),
                    }),
                  'expense',
                )}
              </FormField>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <FormField label={`Split ${i + 1} amount`}>
                    <input
                      className="field"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={s.amount || ''}
                      onChange={(e) =>
                        update({
                          splits: splits.map((a, j) =>
                            i === j
                              ? { ...a, amount: Number(e.target.value) }
                              : a,
                          ),
                        })
                      }
                    />
                  </FormField>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    update({ splits: splits.filter((_, j) => j !== i) })
                  }
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          {splits.length > 0 && (
            <p className="text-sm mt-2">
              Split total:{' '}
              <span className="amount">
                {splits.reduce((s, a) => s + a.amount, 0).toFixed(2)}
              </span>{' '}
              / {Number(amount).toFixed(2)}
            </p>
          )}
        </div>
      )}
      {children}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="btn-primary w-full" disabled={busy} type="submit">
        {busy ? 'Saving…' : saveLabel}
      </button>
    </form>
  );
}
export function TransactionFormModal({
  open,
  onClose,
  transaction,
  defaultType = 'expense',
  defaultDate,
  defaultCategoryId,
}: {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
  defaultType?: TransactionType;
  defaultDate?: string;
  defaultCategoryId?: string | null;
}) {
  const create = useCreateTransaction(),
    edit = useUpdateTransaction();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={transaction ? 'Edit transaction' : 'Enter expense'}
    >
      {open && (
        <ExpenseEditor
          key={transaction?.id ?? 'new'}
          initial={transaction ?? undefined}
          defaultCategoryId={defaultCategoryId}
          defaultType={defaultType}
          defaultDate={defaultDate}
          saveLabel={transaction ? 'Save changes' : 'Save transaction'}
          onSave={async (data) => {
            if (transaction)
              await edit.mutateAsync({ id: transaction.id, data });
            else await create.mutateAsync(data);
            onClose();
          }}
        />
      )}
    </Modal>
  );
}
