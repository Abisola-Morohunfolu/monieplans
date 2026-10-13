import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/currency';
import { getErrorMessage } from '../../lib/errors';
import { useDeleteTransaction } from '../../hooks/useTransactions';
import { Modal } from '../ui/Modal';
import { TransactionFormModal } from './TransactionFormModal';
import { EvidenceImage, useExpense } from './ExpenseFlow';
import type { Transaction } from '../../types';
export function TransactionRows({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const [id, setId] = useState<string | null>(null),
    [editing, setEditing] = useState(false),
    [error, setError] = useState(''),
    remove = useDeleteTransaction(),
    expense = useExpense();
  const {
    data: detail,
    isLoading,
    error: detailError,
  } = useQuery<Transaction>({
    queryKey: ['transactions', 'detail', id],
    queryFn: async () => (await api.get(`/api/transactions/${id}`)).data,
    enabled: !!id,
  });
  return (
    <>
      {transactions.length === 0 && (
        <p className="text-text-secondary py-4">
          No activity here yet. Add an expense to begin.
        </p>
      )}
      {transactions.map((tx) => (
        <button
          key={tx.id}
          className="tx-row"
          onClick={() => {
            setId(tx.id);
            setError('');
          }}
        >
          <div>
            <p className="merchant">
              {tx.payee ||
                tx.categoryName ||
                (tx.type === 'income'
                  ? 'Income'
                  : tx.type === 'transfer'
                    ? 'Own-account transfer'
                    : 'Expense')}
            </p>
            <p className="text-sm text-text-secondary mt-1">
              {tx.occurredOn}
              {tx.categoryName ? ` · ${tx.categoryName}` : ''}
              {tx.type === 'transfer' ? ' · transfer' : ''}
              {tx.paymentStatus !== 'completed' && tx.paymentStatus
                ? ` · ${tx.paymentStatus}`
                : ''}
            </p>
          </div>
          <span
            className={`amount text-right font-semibold ${tx.type === 'income' ? 'text-forest' : ''}`}
          >
            {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '' : '−'}
            {formatCurrency(tx.amount, tx.currency)}
          </span>
        </button>
      ))}
      <Modal
        open={!!id && !editing}
        onClose={() => setId(null)}
        title="Transaction details"
      >
        {isLoading ? (
          <p>Loading details…</p>
        ) : detailError ? (
          <p className="error">{getErrorMessage(detailError)}</p>
        ) : (
          detail && (
            <div className="space-y-4">
              <p className="font-semibold text-lg break-words">
                {detail.payee ?? detail.categoryName ?? 'Transaction'}
              </p>
              <p className="amount text-3xl font-semibold">
                {formatCurrency(detail.amount, detail.currency)}
              </p>
              <p>
                {detail.occurredOn} · {detail.type} · {detail.paymentStatus}
              </p>
              {detail.note && <p>{detail.note}</p>}
              {detail.splits?.map((s, i) => (
                <p className="text-sm amount" key={i}>
                  {s.categoryName ?? 'Uncategorized'}:{' '}
                  {formatCurrency(s.amount, detail.currency)}
                </p>
              ))}
              <div className="flex gap-3 flex-wrap">
                <button
                  className="btn-secondary"
                  onClick={() => setEditing(true)}
                >
                  Edit transaction
                </button>
                {detail.type === 'expense' && (
                  <button
                    className="btn-secondary"
                    onClick={() => expense({ attachTo: detail.id })}
                  >
                    Attach evidence
                  </button>
                )}
                <button
                  className="btn-danger"
                  disabled={remove.isPending}
                  onClick={async () => {
                    if (
                      !window.confirm(
                        'Delete this transaction? Its spending will be removed from your balances.',
                      )
                    )
                      return;
                    try {
                      await remove.mutateAsync(detail.id);
                      setId(null);
                    } catch (e) {
                      setError(getErrorMessage(e));
                    }
                  }}
                >
                  Delete transaction
                </button>
              </div>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              {detail.evidence?.map((v) => (
                <EvidenceImage key={v.id} id={v.id} />
              ))}
            </div>
          )
        )}
      </Modal>
      <TransactionFormModal
        open={editing}
        transaction={detail}
        onClose={() => {
          setEditing(false);
          setId(null);
        }}
      />
    </>
  );
}
