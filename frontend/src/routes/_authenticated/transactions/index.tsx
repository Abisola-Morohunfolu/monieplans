import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTransactions } from '../../../hooks/useTransactions';
import { api } from '../../../lib/api';
import { getErrorMessage } from '../../../lib/errors';
import { TransactionRows } from '../../../components/transactions/TransactionRows';
import { useExpense } from '../../../components/transactions/ExpenseFlow';
import { FormField } from '../../../components/ui/FormField';
import type { TransactionType } from '../../../types';
export const Route = createFileRoute('/_authenticated/transactions/')({
  component: ActivityPage,
});
function ActivityPage() {
  const [search, setSearch] = useState(''),
    [type, setType] = useState(''),
    [month, setMonth] = useState(''),
    [page, setPage] = useState(0),
    expense = useExpense();
  const transactions = useTransactions({
    search: search || undefined,
    type: (type || undefined) as TransactionType | undefined,
    month: month || undefined,
    limit: 20,
    offset: page * 20,
  });
  const captures = useQuery<
    { id: string; status: string; createdAt: string }[]
  >({
    queryKey: ['captures'],
    queryFn: async () => (await api.get('/api/captures')).data,
    refetchInterval: 10000,
  });
  return (
    <div>
      <h1 className="page-title">Activity</h1>
      <p className="text-text-secondary mt-2">
        Every expense, income, and own-account transfer.
      </p>
      <div className="space-y-4 my-6">
        <FormField label="Search activity">
          <input
            className="field"
            placeholder="Merchant or note"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Transaction type">
            <select
              className="field"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All activity</option>
              <option value="expense">Expenses</option>
              <option value="income">Income</option>
              <option value="transfer">Transfers</option>
            </select>
          </FormField>
          <FormField label="Spending month">
            <input
              className="field"
              type="month"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setPage(0);
              }}
            />
          </FormField>
        </div>
      </div>
      {(captures.data?.filter((c) => c.status !== 'confirmed').length ?? 0) >
        0 && (
        <div>
          <h2 className="section-heading">Capture drafts</h2>
          {captures.data
            ?.filter((c) => c.status !== 'confirmed')
            .map((c) => (
              <button
                className="tx-row"
                key={c.id}
                onClick={() => expense({ captureId: c.id })}
              >
                <span>
                  Receipt or screenshot
                  <span className="block text-sm text-text-secondary">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </span>
                <span className="text-sm">
                  {c.status === 'failed'
                    ? 'Retry needed'
                    : c.status === 'ready'
                      ? 'Review and save'
                      : 'Processing'}
                </span>
              </button>
            ))}
        </div>
      )}
      {transactions.isLoading ? (
        <p>Loading activity…</p>
      ) : transactions.error ? (
        <p className="error">{getErrorMessage(transactions.error)}</p>
      ) : (
        <TransactionRows transactions={transactions.data?.data ?? []} />
      )}
      <div className="flex justify-between gap-3 items-center mt-5">
        <button
          className="btn-secondary"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        <span className="text-sm">Page {page + 1}</span>
        <button
          className="btn-secondary"
          disabled={!transactions.data?.pagination.hasMore}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
