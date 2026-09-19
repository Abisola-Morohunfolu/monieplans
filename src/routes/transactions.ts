import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { generateId, nowISO, toCents, monthRange } from '../shared/utils';
import { serializeTransaction } from '../shared/serializers';
import {
  createTransactionSchema,
  updateTransactionSchema,
  listTransactionsQuerySchema,
} from '../shared/schemas';
import { validateJson, validateQuery } from '../shared/validate';
import { and, desc, eq, gte, isNull, lt, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import * as schema from '../database/schema';
import {
  getPreferredCurrency,
  assertCategoryVisible,
  type Db,
} from './helpers';
import { paginated, resolveLimitOffset } from '../shared/pagination';

export const transactionsRouter = new Hono();

transactionsRouter.post(
  '/',
  validateJson(createTransactionSchema),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const body = c.get('body') as unknown as ReturnType<
      typeof createTransactionSchema.parse
    >;

    const currency = await getPreferredCurrency(db, user.id);
    if (body.categoryId) {
      await assertCategoryVisible(db, user.id, body.categoryId);
    }

    const now = nowISO();
    const [transaction] = await db
      .insert(schema.transactions)
      .values({
        id: generateId(),
        userId: user.id,
        type: body.type,
        amountCents: toCents(body.amount),
        currency,
        occurredOn: body.occurredOn,
        categoryId: body.categoryId ?? null,
        payee: body.payee ?? null,
        note: body.note ?? null,
        source: 'manual',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return c.json(serializeTransaction(transaction), 201);
  },
);

transactionsRouter.get(
  '/',
  validateQuery(listTransactionsQuerySchema),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const query = c.get('query') as unknown as ReturnType<
      typeof listTransactionsQuerySchema.parse
    >;
    const { limit, offset } = resolveLimitOffset(query);

    const conditions: SQL[] = [
      eq(schema.transactions.userId, user.id),
      isNull(schema.transactions.deletedAt),
    ];

    if (query.month) {
      const { start, nextStart } = monthRange(query.month);
      conditions.push(
        gte(schema.transactions.occurredOn, start),
        lt(schema.transactions.occurredOn, nextStart),
      );
    }
    if (query.categoryId) {
      conditions.push(eq(schema.transactions.categoryId, query.categoryId));
    }
    if (query.type) {
      conditions.push(eq(schema.transactions.type, query.type));
    }
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        sql`(LOWER(COALESCE(${schema.transactions.payee}, '')) LIKE LOWER(${term}) OR LOWER(COALESCE(${schema.transactions.note}, '')) LIKE LOWER(${term}))`,
      );
    }

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.transactions)
      .where(and(...conditions));
    const total = Number(countRow?.count ?? 0);

    const rows = await db
      .select({
        id: schema.transactions.id,
        type: schema.transactions.type,
        amountCents: schema.transactions.amountCents,
        currency: schema.transactions.currency,
        occurredOn: schema.transactions.occurredOn,
        categoryId: schema.transactions.categoryId,
        categoryName: schema.categories.name,
        categoryCode: schema.categories.code,
        payee: schema.transactions.payee,
        note: schema.transactions.note,
        source: schema.transactions.source,
        createdAt: schema.transactions.createdAt,
        updatedAt: schema.transactions.updatedAt,
      })
      .from(schema.transactions)
      .leftJoin(
        schema.categories,
        eq(schema.transactions.categoryId, schema.categories.id),
      )
      .where(and(...conditions))
      .orderBy(
        desc(schema.transactions.occurredOn),
        desc(schema.transactions.createdAt),
      )
      .limit(limit)
      .offset(offset);

    return c.json(
      paginated(rows.map(serializeTransaction), total, limit, offset),
    );
  },
);

async function getTransactionOrThrow(db: Db, userId: string, id: string) {
  const [transaction] = await db
    .select()
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.id, id),
        eq(schema.transactions.userId, userId),
        isNull(schema.transactions.deletedAt),
      ),
    );
  if (!transaction) {
    throw new HTTPException(404, { message: 'Transaction not found' });
  }
  return transaction;
}

transactionsRouter.patch(
  '/:id',
  validateJson(updateTransactionSchema),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const id = c.req.param('id') as string;
    const body = c.get('body') as unknown as ReturnType<
      typeof updateTransactionSchema.parse
    >;

    await getTransactionOrThrow(db, user.id, id);

    if (body.categoryId) {
      await assertCategoryVisible(db, user.id, body.categoryId);
    }

    const values: Record<string, unknown> = { updatedAt: nowISO() };
    if (body.type !== undefined) values.type = body.type;
    if (body.amount !== undefined) values.amountCents = toCents(body.amount);
    if (body.occurredOn !== undefined) values.occurredOn = body.occurredOn;
    if (body.categoryId !== undefined) values.categoryId = body.categoryId;
    if (body.payee !== undefined) values.payee = body.payee;
    if (body.note !== undefined) values.note = body.note;

    const [updated] = await db
      .update(schema.transactions)
      .set(values)
      .where(
        and(
          eq(schema.transactions.id, id),
          eq(schema.transactions.userId, user.id),
        ),
      )
      .returning();

    return c.json(serializeTransaction(updated));
  },
);

transactionsRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const id = c.req.param('id');

  await getTransactionOrThrow(db, user.id, id);

  await db
    .update(schema.transactions)
    .set({ deletedAt: nowISO(), updatedAt: nowISO() })
    .where(
      and(
        eq(schema.transactions.id, id),
        eq(schema.transactions.userId, user.id),
      ),
    );

  return c.json({ ok: true });
});
