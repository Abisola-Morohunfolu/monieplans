import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../index';
import {
  createTransactionSchema,
  updateTransactionSchema,
  listTransactionsQuerySchema,
} from '../shared/schemas';
import { validateJson, validateQuery } from '../shared/validate';
import { atomic, revision, statement } from '../services/ledger';
import {
  insertExpense,
  serializeRecord,
  splitStatements,
  transactionDetails,
  validateExpense,
  transactionCurrency,
  type TransactionRecord,
} from '../services/transactions';
import { monthRange, toCents } from '../shared/utils';
import { getPreferredCurrency } from './helpers';
import { paginated, resolveLimitOffset } from '../shared/pagination';
export const transactionsRouter = new Hono<{ Bindings: Env }>();
transactionsRouter.post(
  '/',
  validateJson(createTransactionSchema),
  async (c) => {
    const body = createTransactionSchema.parse(c.get('body')),
      uid = c.get('user').id,
      db = c.env.DB,
      id = body.id ?? crypto.randomUUID();
    const version = await revision(db, uid);
    const existing = await statement(
      db,
      'SELECT id FROM transactions WHERE id=? AND user_id=?',
      id,
      uid,
    ).first();
    if (existing) return c.json(await transactionDetails(db, uid, id));
    const currency = await transactionCurrency(
      db,
      uid,
      body.occurredOn,
      await getPreferredCurrency(c.get('db'), uid),
    );
    await validateExpense(db, uid, body, currency);
    await atomic(db, uid, version, insertExpense(db, uid, id, body, currency));
    return c.json(await transactionDetails(db, uid, id), 201);
  },
);
transactionsRouter.get(
  '/',
  validateQuery(listTransactionsQuerySchema),
  async (c) => {
    const q = listTransactionsQuerySchema.parse(c.get('query')),
      uid = c.get('user').id,
      { limit, offset } = resolveLimitOffset(q),
      args: (string | number)[] = [uid];
    const conditions = ['t.user_id=?', 't.deleted_at IS NULL'];
    if (q.month) {
      const r = monthRange(q.month);
      conditions.push('t.occurred_on>=? AND t.occurred_on<?');
      args.push(r.start, r.nextStart);
    }
    if (q.categoryId === '__buffer__') {
      conditions.push(
        "(t.type='expense' AND ((t.category_id IS NULL AND NOT EXISTS(SELECT 1 FROM transaction_splits s WHERE s.transaction_id=t.id)) OR EXISTS(SELECT 1 FROM transaction_splits s WHERE s.transaction_id=t.id AND s.category_id IS NULL)))",
      );
    } else if (q.categoryId) {
      conditions.push(
        '(t.category_id=? OR EXISTS(SELECT 1 FROM transaction_splits s WHERE s.transaction_id=t.id AND s.category_id=?))',
      );
      args.push(q.categoryId, q.categoryId);
    }
    if (q.type) {
      conditions.push('t.type=?');
      args.push(q.type);
    }
    if (q.search) {
      conditions.push(
        "(LOWER(COALESCE(t.payee,'')) LIKE LOWER(?) OR LOWER(COALESCE(t.note,'')) LIKE LOWER(?))",
      );
      args.push('%' + q.search + '%', '%' + q.search + '%');
    }
    const where = conditions.join(' AND '),
      db = c.env.DB;
    const result = await db.batch<Record<string, unknown>>([
      statement(
        db,
        'SELECT count(*) total FROM transactions t WHERE ' + where,
        ...args,
      ),
      statement(
        db,
        'SELECT t.*,c.name category_name,c.code category_code FROM transactions t LEFT JOIN categories c ON c.id=t.category_id WHERE ' +
          where +
          ' ORDER BY t.occurred_on DESC,t.created_at DESC LIMIT ? OFFSET ?',
        ...args,
        limit,
        offset,
      ),
    ]);
    return c.json(
      paginated(
        (result[1].results as unknown as TransactionRecord[]).map(
          serializeRecord,
        ),
        Number(result[0].results[0]?.total ?? 0),
        limit,
        offset,
      ),
    );
  },
);
transactionsRouter.get('/:id', async (c) =>
  c.json(
    await transactionDetails(c.env.DB, c.get('user').id, c.req.param('id')!),
  ),
);
transactionsRouter.patch(
  '/:id',
  validateJson(updateTransactionSchema),
  async (c) => {
    const uid = c.get('user').id,
      db = c.env.DB,
      id = c.req.param('id')!,
      version = await revision(db, uid),
      old = await transactionDetails(db, uid, id),
      patch = updateTransactionSchema.parse(c.get('body'));
    const body = createTransactionSchema.parse({
      ...old,
      ...patch,
      splits: patch.splits ?? old.splits,
    });
    const currency = patch.currency ?? old.currency;
    await validateExpense(db, uid, body, currency);
    const queries = [
      statement(
        db,
        'UPDATE transactions SET type=?,currency=?,amount_cents=?,occurred_on=?,category_id=?,payee=?,note=?,payment_status=?,updated_at=? WHERE id=? AND user_id=?',
        body.type,
        currency,
        toCents(body.amount),
        body.occurredOn,
        body.splits?.length ? null : (body.categoryId ?? null),
        body.payee ?? null,
        body.note ?? null,
        body.paymentStatus,
        new Date().toISOString(),
        id,
        uid,
      ),
      statement(
        db,
        'DELETE FROM transaction_splits WHERE transaction_id=?',
        id,
      ),
      ...splitStatements(db, id, body.splits ?? []),
    ];
    await atomic(db, uid, version, queries);
    return c.json(await transactionDetails(db, uid, id));
  },
);
transactionsRouter.delete('/:id', async (c) => {
  const db = c.env.DB,
    uid = c.get('user').id,
    id = c.req.param('id')!,
    version = await revision(db, uid);
  await transactionDetails(db, uid, id);
  await atomic(db, uid, version, [
    statement(
      db,
      'UPDATE transactions SET deleted_at=?,updated_at=? WHERE id=? AND user_id=?',
      new Date().toISOString(),
      new Date().toISOString(),
      id,
      uid,
    ),
  ]);
  return c.json({ ok: true });
});
