import { usePreferredTimezone } from '../../hooks/useCurrency';
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, ImageUp, PenLine } from 'lucide-react';
import { api } from '../../lib/api';
import { getErrorMessage } from '../../lib/errors';
import { Modal } from '../ui/Modal';
import { ExpenseEditor } from './TransactionFormModal';
import { useBudget } from '../../hooks/useBudget';
import { currentMonth } from '../../lib/month';
import type { Capture, CreateTransactionInput } from '../../types';
type Start = {
  currency?: string;
  categoryId?: string | null;
  month?: string;
  captureId?: string;
  attachTo?: string;
};
const ExpenseContext = createContext<(options?: Start) => void>(() => {});
export const useExpense = () => useContext(ExpenseContext);
export function ExpenseProvider({ children }: { children: ReactNode }) {
  const [start, setStart] = useState<Start | null>(null);
  return (
    <ExpenseContext.Provider value={(options) => setStart(options ?? {})}>
      {children}
      {start && (
        <CaptureFlow
          key={start.captureId ?? `${start.categoryId}-${start.attachTo}`}
          options={start}
          onClose={() => setStart(null)}
        />
      )}
    </ExpenseContext.Provider>
  );
}
function CaptureFlow({
  options,
  onClose,
}: {
  options: Start;
  onClose: () => void;
}) {
  const timezone = usePreferredTimezone();
  const [mode, setMode] = useState(options.captureId ? 'capture' : 'choose'),
    [id, setId] = useState(options.captureId ?? ''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [identical, setIdentical] = useState(false),
    [duplicate, setDuplicate] = useState(false),
    [completed, setCompleted] = useState(false),
    [otherMonth, setOtherMonth] = useState(false);
  const photo = useRef<HTMLInputElement>(null),
    upload = useRef<HTMLInputElement>(null),
    qc = useQueryClient(),
    manualId = useRef(crypto.randomUUID());
  const { data: capture } = useQuery<Capture>({
    queryKey: ['capture', id],
    queryFn: async () => (await api.get(`/api/captures/${id}`)).data,
    enabled: !!id,
    refetchInterval: (q) =>
      ['queued', 'processing'].includes(q.state.data?.status ?? '')
        ? 2000
        : false,
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['transactions'] });
    qc.invalidateQueries({ queryKey: ['budgets'] });
    qc.invalidateQueries({ queryKey: ['reviews'] });
    qc.invalidateQueries({ queryKey: ['captures'] });
  };
  const attach = async (captureId: string, transactionId: string) => {
    await api.post(`/api/captures/${captureId}/attach`, { transactionId });
    refresh();
    onClose();
  };
  const selectFile = async (file: File | undefined) => {
    if (!file) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      setError(
        'Use JPEG, PNG, or WebP up to 10MB. Export HEIC or PDF as an image first.',
      );
      return;
    }
    setBusy(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (options.categoryId) params.set('categoryId', options.categoryId);
      params.set('month', options.month ?? currentMonth(timezone));
      const { data } = await api.post(`/api/captures?${params}`, file, {
        headers: { 'Content-Type': file.type },
      });
      setId(data.id);
      setIdentical(data.identicalUpload);
      if (options.attachTo) {
        await attach(data.id, options.attachTo);
        return;
      }
      setMode('capture');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const manualSave = async (data: CreateTransactionInput) => {
    if (id)
      await api.post(`/api/captures/${id}/confirm`, {
        ...data,
        manualReview: true,
        duplicateAcknowledged: duplicate,
        statusAcknowledged: completed,
        dateAcknowledged: otherMonth,
      });
    else
      await api.post('/api/transactions', {
        ...data,
        id: data.id ?? manualId.current,
      });
    refresh();
    onClose();
  };
  const save = async (data: CreateTransactionInput) => {
    await api.post(`/api/captures/${id}/confirm`, {
      ...data,
      duplicateAcknowledged: duplicate,
      statusAcknowledged: completed,
      dateAcknowledged: otherMonth,
    });
    refresh();
    onClose();
  };
  const contextBudget = useBudget(options.month ?? currentMonth(timezone));
  const defaultCurrency = options.currency ?? contextBudget.data?.currency;
  const x = capture?.extracted;
  const initial: Partial<CreateTransactionInput> = {
    type:
      x?.type === 'income'
        ? 'income'
        : x?.type === 'transfer'
          ? 'transfer'
          : 'expense',
    amount: x?.amount ?? 0,
    occurredOn: x?.occurredOn ?? '',
    payee: x?.payee ?? '',
    currency: x?.currency ?? defaultCurrency ?? '',
    categoryId:
      options.categoryId ??
      capture?.defaultCategoryId ??
      x?.suggestedCategoryId ??
      null,
    paymentStatus:
      x?.paymentStatus === 'completed'
        ? 'completed'
        : x?.paymentStatus === 'failed'
          ? 'failed'
          : 'pending',
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={
        options.attachTo
          ? 'Attach evidence'
          : mode === 'choose'
            ? 'Add expense'
            : mode === 'manual'
              ? 'Enter expense'
              : capture?.status === 'ready'
                ? 'Review capture'
                : 'Receipt or screenshot'
      }
    >
      <input
        ref={photo}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        aria-label="Take receipt photo"
        onChange={(e) => selectFile(e.target.files?.[0])}
      />
      <input
        ref={upload}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        aria-label="Upload receipt or screenshot"
        onChange={(e) => selectFile(e.target.files?.[0])}
      />
      {mode === 'choose' && (
        <div className="space-y-3">
          <p className="text-text-secondary mb-5">
            Capture a receipt or transfer screenshot, then check every field
            before saving.
          </p>
          <button
            className="btn-secondary w-full justify-start"
            disabled={busy}
            onClick={() => photo.current?.click()}
          >
            <Camera size={20} />
            Take receipt photo
          </button>
          <button
            className="btn-secondary w-full justify-start"
            disabled={busy}
            onClick={() => upload.current?.click()}
          >
            <ImageUp size={20} />
            Upload receipt or screenshot
          </button>
          {!options.attachTo && (
            <button
              className="btn-secondary w-full justify-start"
              onClick={() => setMode('manual')}
            >
              <PenLine size={20} />
              Enter manually
            </button>
          )}
          <p className="text-sm text-text-secondary">
            JPEG, PNG, WebP · up to 10MB. For HEIC or PDF, export an image
            first.
          </p>
          {busy && <p role="status">Uploading…</p>}
        </div>
      )}
      {mode === 'manual' && contextBudget.isLoading && (
        <p role="status">Loading spending currency…</p>
      )}
      {mode === 'manual' && !contextBudget.isLoading && (
        <ExpenseEditor
          initial={{
            ...(defaultCurrency ? { currency: defaultCurrency } : {}),
            ...(id ? { paymentStatus: 'pending' as const } : {}),
          }}
          defaultCategoryId={options.categoryId ?? capture?.defaultCategoryId}
          draftKey={`manual:${id || manualId.current}`}
          onSave={manualSave}
        >
          {id && (
            <div className="space-y-3">
              <p className="notice">
                The image could not be verified. Pending and failed payments are
                excluded from spending; only mark Completed after checking the
                payment.
              </p>
              <label className="flex gap-3 items-start text-sm">
                <input
                  type="checkbox"
                  checked={completed}
                  onChange={(e) => setCompleted(e.target.checked)}
                />
                If marked Completed, I have verified this payment completed.
              </label>
              <label className="flex gap-3 items-start text-sm">
                <input
                  type="checkbox"
                  checked={otherMonth}
                  onChange={(e) => setOtherMonth(e.target.checked)}
                />
                I confirm the spending date, including another month if
                applicable.
              </label>
              <label className="flex gap-3 items-start text-sm">
                <input
                  type="checkbox"
                  checked={duplicate}
                  onChange={(e) => setDuplicate(e.target.checked)}
                />
                If a similar expense exists, this is a separate payment.
              </label>
            </div>
          )}
        </ExpenseEditor>
      )}
      {mode === 'capture' && (
        <div className="space-y-4">
          {identical && (
            <p className="notice">
              This identical image was uploaded before. We’ve opened that
              capture.
            </p>
          )}
          {!capture && <p role="status">Loading capture…</p>}
          {capture?.transactionId && (
            <p className="notice">
              This image is already saved with a transaction. Find it in
              Activity.
            </p>
          )}
          {capture &&
            !capture.transactionId &&
            ['queued', 'processing'].includes(capture.status) && (
              <p role="status">
                Reading your image… You can close this and return from Activity.
                Nothing is saved as an expense yet.
              </p>
            )}
          {capture?.status === 'failed' && (
            <>
              <p className="error">{capture.error}</p>
              <button
                className="btn-secondary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api.post(`/api/captures/${id}/retry`);
                    qc.invalidateQueries({ queryKey: ['capture', id] });
                  } catch (e) {
                    setError(getErrorMessage(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Retry processing
              </button>
              <button
                className="btn-secondary ml-2"
                onClick={() => {
                  setId('');
                  setMode('choose');
                }}
              >
                Choose clearer image
              </button>
            </>
          )}
          {capture && !capture.transactionId && capture.status !== 'ready' && (
            <button className="btn-secondary" onClick={() => setMode('manual')}>
              Enter manually and attach this image
            </button>
          )}
          {capture?.status === 'ready' && x && !capture.transactionId && (
            <>
              <p className="notice">
                {x.confidence === 'low' ? 'This image was hard to read. ' : ''}
                Check amount, date, currency, category, and payment status.{' '}
                {x.warnings.join(' ')}
              </p>
              <EvidenceImage id={id} />
              <ExpenseEditor
                initial={initial}
                draftKey={`capture:${id}`}
                onSave={save}
                saveLabel="Confirm and save"
              >
                {capture.openedMonth && (
                  <p className="notice">
                    The receipt date determines its month. You opened capture
                    from {capture.openedMonth}
                    {x.occurredOn?.slice(0, 7) !== capture.openedMonth &&
                    x.occurredOn
                      ? `, but this receipt is dated ${x.occurredOn}`
                      : ''}
                    .
                  </p>
                )}
                <label className="flex gap-3 items-start text-sm">
                  <input
                    className="mt-1"
                    type="checkbox"
                    checked={otherMonth}
                    onChange={(e) => setOtherMonth(e.target.checked)}
                  />
                  I confirm the date, including a different spending month if
                  applicable.
                </label>
                {x.paymentStatus !== 'completed' && (
                  <label className="flex gap-3 items-start text-sm">
                    <input
                      className="mt-1"
                      type="checkbox"
                      checked={completed}
                      onChange={(e) => setCompleted(e.target.checked)}
                    />
                    The image does not show a completed payment. I verified it
                    completed and have selected Completed above.
                  </label>
                )}
                {capture.likelyDuplicates.length > 0 && (
                  <div className="notice">
                    <p>A similar payment already exists:</p>
                    {capture.likelyDuplicates.map((tx) => (
                      <div key={tx.id} className="mt-2">
                        <p>
                          {tx.payee} · {tx.occurredOn} · {tx.amount}
                        </p>
                        <button
                          type="button"
                          className="btn-secondary mt-2"
                          onClick={async () => {
                            try {
                              await attach(id, tx.id);
                            } catch (e) {
                              setError(getErrorMessage(e));
                            }
                          }}
                        >
                          Attach to this expense
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex gap-3 items-start text-sm">
                  <input
                    className="mt-1"
                    type="checkbox"
                    checked={duplicate}
                    onChange={(e) => setDuplicate(e.target.checked)}
                  />
                  If a similar expense exists, this is a separate payment.
                </label>
              </ExpenseEditor>
            </>
          )}
        </div>
      )}
      {error && (
        <p className="error mt-4" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
export function EvidenceImage({ id }: { id: string }) {
  const { data } = useQuery({
    queryKey: ['evidence', id],
    queryFn: async () => {
      const response = await api.get(`/api/captures/${id}/image`, {
        responseType: 'blob',
      });
      return response.data as Blob;
    },
  });
  const [url, setUrl] = useState('');
  // Blob URLs keep authenticated evidence private and never expose the R2 object.
  useBlob(data, setUrl);
  return url ? (
    <img
      src={url}
      alt="Receipt or transfer evidence"
      className="max-h-64 max-w-full mx-auto rounded-lg"
    />
  ) : null;
}
import { useEffect } from 'react';
function useBlob(data: Blob | undefined, setUrl: (s: string) => void) {
  useEffect(() => {
    if (!data) return;
    const url = URL.createObjectURL(data);
    setUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [data, setUrl]);
}
