import { HTTPException } from 'hono/http-exception';
import { statement } from './ledger';
import { toCents } from '../shared/utils';
import type { CreateTransactionInput } from '../shared/schemas';
export interface TransactionRecord {
  id: string;
  user_id: string;
  type: string;
  amount_cents: number;
  currency: string;
  occurred_on: string;
  category_id: string | null;
  payee: string | null;
  note: string | null;
  source: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  category_name?: string | null;
  category_code?: string | null;
}
export async function transactionCurrency(
  db: D1Database,
  userId: string,
  date: string,
  fallback: string,
) {
  return (
    (
      await statement(
        db,
        'SELECT currency FROM budgets WHERE user_id=? AND month=?',
        userId,
        date.slice(0, 7),
      ).first<{ currency: string }>()
    )?.currency ?? fallback
  );
}
export async function validateExpense(
  db: D1Database,
  userId: string,
  body: CreateTransactionInput,
  currency: string,
) {
  if (body.currency && body.currency !== currency)
    throw new HTTPException(400, {
      message: `This spending month uses ${currency}. Convert the amount before saving.`,
    });
  if (
    body.splits?.length &&
    (body.type !== 'expense' ||
      body.splits.reduce((s, a) => s + toCents(a.amount), 0) !==
        toCents(body.amount))
  )
    throw new HTTPException(400, {
      message: 'Expense splits must equal the total amount.',
    });
  for (const id of new Set(
    [body.categoryId, ...(body.splits ?? []).map((s) => s.categoryId)].filter(
      (v): v is string => !!v,
    ),
  )) {
    const category = await statement(
      db,
      'SELECT kind FROM categories WHERE id=? AND (user_id IS NULL OR user_id=?)',
      id,
      userId,
    ).first<{ kind: string }>();
    if (!category || (body.type !== 'transfer' && category.kind !== body.type))
      throw new HTTPException(400, {
        message: 'Choose a category for this transaction type.',
      });
  }
}
export function insertExpense(
  db: D1Database,
  userId: string,
  id: string,
  body: CreateTransactionInput,
  currency: string,
  source = 'manual',
) {
  const now = new Date().toISOString();
  return [
    statement(
      db,
      'INSERT INTO transactions(id,user_id,type,amount_cents,currency,occurred_on,category_id,payee,note,source,payment_status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',
      id,
      userId,
      body.type,
      toCents(body.amount),
      currency,
      body.occurredOn,
      body.splits?.length ? null : (body.categoryId ?? null),
      body.payee ?? null,
      body.note ?? null,
      source,
      body.paymentStatus,
      now,
      now,
    ),
    ...splitStatements(db, id, body.splits ?? []),
  ];
}
export function splitStatements(
  db: D1Database,
  id: string,
  splits: NonNullable<CreateTransactionInput['splits']>,
) {
  return splits.map((s) =>
    statement(
      db,
      'INSERT INTO transaction_splits(id,transaction_id,category_id,amount_cents) VALUES(?,?,?,?)',
      crypto.randomUUID(),
      id,
      s.categoryId,
      toCents(s.amount),
    ),
  );
}
export async function transactionDetails(
  db: D1Database,
  userId: string,
  id: string,
) {
  const t = await statement(
    db,
    `SELECT t.*,c.name category_name,c.code category_code FROM transactions t LEFT JOIN categories c ON c.id=t.category_id WHERE t.id=? AND t.user_id=? AND t.deleted_at IS NULL`,
    id,
    userId,
  ).first<TransactionRecord>();
  if (!t) throw new HTTPException(404, { message: 'Transaction not found' });
  const splits = await statement(
    db,
    'SELECT s.category_id categoryId,s.amount_cents/100.0 amount,c.name categoryName FROM transaction_splits s LEFT JOIN categories c ON s.category_id=c.id WHERE transaction_id=?',
    id,
  ).all();
  const evidence = await statement(
    db,
    'SELECT id,mime_type mimeType,created_at createdAt FROM captures WHERE transaction_id=? AND user_id=?',
    id,
    userId,
  ).all();
  return {
    ...serializeRecord(t),
    splits: splits.results,
    evidence: evidence.results,
  };
}
export function serializeRecord(t: TransactionRecord) {
  return {
    id: t.id,
    type: t.type,
    amount: t.amount_cents / 100,
    currency: t.currency,
    occurredOn: t.occurred_on,
    categoryId: t.category_id,
    categoryName: t.category_name ?? null,
    categoryCode: t.category_code ?? null,
    payee: t.payee,
    note: t.note,
    source: t.source,
    paymentStatus: t.payment_status,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}
