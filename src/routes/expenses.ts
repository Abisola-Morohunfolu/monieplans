import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { and, desc, eq, gte, inArray, isNull, lte, sql } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import * as schema from '../database/schema';
import { generateId, nowISO, toCents } from '../shared/utils';
import { serializeExpense } from '../shared/serializers';
import {
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesQuerySchema,
  confirmReceiptItemsSchema,
} from '../shared/schemas';
import { validateJson, validateQuery } from '../shared/validate';
import { paginated, resolveLimitOffset } from '../shared/pagination';
import {
  assertCategoryVisible,
  buildWeekCacheUpdate,
  findWeekForDate,
  getActiveBudgetPeriod,
  resolveReceiptContext,
  type D1Query,
} from './helpers';

type ExpenseRow = InferSelectModel<typeof schema.expenseEntries>;

const env = (c: { env: unknown }) =>
  c.env as {
    DB: D1Database;
    R2: R2Bucket;
    RECEIPT_PROCESSING: Queue;
    STATEMENT_PROCESSING: Queue;
  };

export const expensesRouter = new Hono();

expensesRouter.post('/', validateJson(createExpenseSchema), async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const body = c.get('body') as unknown as ReturnType<
    typeof createExpenseSchema.parse
  >;

  const budgetPeriod = await getActiveBudgetPeriod(db, user.id);

  if (body.categoryId) {
    await assertCategoryVisible(db, user.id, body.categoryId);
  }

  const receiptContext = body.receiptId
    ? await resolveReceiptContext(
        db,
        user.id,
        body.receiptId,
        body.merchantName ?? null,
      )
    : null;

  const week = await findWeekForDate(db, budgetPeriod.id, body.expenseDate);
  const weeklyBudgetAllocationId = week?.id ?? null;

  const amountCents = toCents(body.amount);
  const expenseId = generateId();
  const now = nowISO();

  const queries: D1Query[] = [
    db
      .insert(schema.expenseEntries)
      .values({
        id: expenseId,
        userId: user.id,
        budgetPeriodId: budgetPeriod.id,
        weeklyBudgetAllocationId,
        categoryId: body.categoryId ?? null,
        amountCents,
        expenseDate: body.expenseDate,
        description: body.description ?? null,
        sourceType: receiptContext?.sourceType ?? 'manual',
        merchantName: receiptContext?.merchantName ?? body.merchantName ?? null,
        receiptParseStatus: body.receiptId ? 'confirmed' : 'not_applicable',
        createdAt: now,
        updatedAt: now,
      })
      .returning(),
  ];

  if (body.receiptId) {
    queries.push(
      db
        .update(schema.expenseEntryReceipts)
        .set({ expenseEntryId: expenseId, parseStatus: 'confirmed' })
        .where(eq(schema.expenseEntryReceipts.id, body.receiptId)),
    );
  }

  if (weeklyBudgetAllocationId) {
    queries.push(
      buildWeekCacheUpdate(db, weeklyBudgetAllocationId, amountCents),
    );
  }

  const results = await db.batch(queries as [D1Query, ...D1Query[]]);
  const [expense] = results[0] as ExpenseRow[];

  return c.json(serializeExpense(expense), 201);
});

expensesRouter.get('/', validateQuery(listExpensesQuerySchema), async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const query = c.get('query') as unknown as ReturnType<
    typeof listExpensesQuerySchema.parse
  >;

  const conditions: ReturnType<typeof eq>[] = [
    eq(schema.expenseEntries.userId, user.id),
    isNull(schema.expenseEntries.deletedAt),
  ];

  if (query.budgetPeriodId) {
    conditions.push(
      eq(schema.expenseEntries.budgetPeriodId, query.budgetPeriodId),
    );
  }
  if (query.weeklyBudgetAllocationId) {
    conditions.push(
      eq(
        schema.expenseEntries.weeklyBudgetAllocationId,
        query.weeklyBudgetAllocationId,
      ),
    );
  }
  if (query.categoryId) {
    conditions.push(eq(schema.expenseEntries.categoryId, query.categoryId));
  }
  if (query.startDate) {
    conditions.push(gte(schema.expenseEntries.expenseDate, query.startDate));
  }
  if (query.endDate) {
    conditions.push(lte(schema.expenseEntries.expenseDate, query.endDate));
  }
  if (query.sourceType) {
    conditions.push(eq(schema.expenseEntries.sourceType, query.sourceType));
  }
  if (query.search) {
    const searchTerm = `%${query.search}%`;
    conditions.push(
      sql`(LOWER(${schema.expenseEntries.description}) LIKE LOWER(${searchTerm}) OR LOWER(${schema.expenseEntries.merchantName}) LIKE LOWER(${searchTerm}))`,
    );
  }

  const { limit, offset } = resolveLimitOffset(query);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.expenseEntries)
    .where(and(...conditions));
  const total = Number(countRow?.count ?? 0);

  const expenses = await db
    .select({
      id: schema.expenseEntries.id,
      userId: schema.expenseEntries.userId,
      budgetPeriodId: schema.expenseEntries.budgetPeriodId,
      weeklyBudgetAllocationId: schema.expenseEntries.weeklyBudgetAllocationId,
      categoryId: schema.expenseEntries.categoryId,
      categoryName: schema.categories.name,
      categoryCode: schema.categories.code,
      amountCents: schema.expenseEntries.amountCents,
      expenseDate: schema.expenseEntries.expenseDate,
      description: schema.expenseEntries.description,
      sourceType: schema.expenseEntries.sourceType,
      merchantName: schema.expenseEntries.merchantName,
      receiptParseConfidence: schema.expenseEntries.receiptParseConfidence,
      receiptParseStatus: schema.expenseEntries.receiptParseStatus,
      createdAt: schema.expenseEntries.createdAt,
      updatedAt: schema.expenseEntries.updatedAt,
    })
    .from(schema.expenseEntries)
    .leftJoin(
      schema.categories,
      eq(schema.expenseEntries.categoryId, schema.categories.id),
    )
    .where(and(...conditions))
    .orderBy(
      desc(schema.expenseEntries.expenseDate),
      desc(schema.expenseEntries.createdAt),
    )
    .limit(limit)
    .offset(offset);

  return c.json(
    paginated(expenses.map(serializeExpense), total, limit, offset),
  );
});

expensesRouter.get('/receipts/:id', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const id = c.req.param('id');

  const [receipt] = await db
    .select()
    .from(schema.expenseEntryReceipts)
    .where(
      and(
        eq(schema.expenseEntryReceipts.id, id),
        eq(schema.expenseEntryReceipts.userId, user.id),
        isNull(schema.expenseEntryReceipts.deletedAt),
      ),
    );

  if (!receipt) throw new HTTPException(404, { message: 'Receipt not found' });
  return c.json(receipt);
});

expensesRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const id = c.req.param('id');

  const [expense] = await db
    .select({
      id: schema.expenseEntries.id,
      userId: schema.expenseEntries.userId,
      budgetPeriodId: schema.expenseEntries.budgetPeriodId,
      weeklyBudgetAllocationId: schema.expenseEntries.weeklyBudgetAllocationId,
      categoryId: schema.expenseEntries.categoryId,
      categoryName: schema.categories.name,
      categoryCode: schema.categories.code,
      amountCents: schema.expenseEntries.amountCents,
      expenseDate: schema.expenseEntries.expenseDate,
      description: schema.expenseEntries.description,
      sourceType: schema.expenseEntries.sourceType,
      merchantName: schema.expenseEntries.merchantName,
      receiptParseConfidence: schema.expenseEntries.receiptParseConfidence,
      receiptParseStatus: schema.expenseEntries.receiptParseStatus,
      createdAt: schema.expenseEntries.createdAt,
      updatedAt: schema.expenseEntries.updatedAt,
    })
    .from(schema.expenseEntries)
    .leftJoin(
      schema.categories,
      eq(schema.expenseEntries.categoryId, schema.categories.id),
    )
    .where(
      and(
        eq(schema.expenseEntries.id, id),
        eq(schema.expenseEntries.userId, user.id),
        isNull(schema.expenseEntries.deletedAt),
      ),
    );

  if (!expense) throw new HTTPException(404, { message: 'Expense not found' });
  return c.json(serializeExpense(expense));
});

expensesRouter.patch('/:id', validateJson(updateExpenseSchema), async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const id = c.req.param('id')!;
  const body = c.get('body') as unknown as ReturnType<
    typeof updateExpenseSchema.parse
  >;

  const [expense] = await db
    .select()
    .from(schema.expenseEntries)
    .where(
      and(
        eq(schema.expenseEntries.id, id),
        eq(schema.expenseEntries.userId, user.id),
        isNull(schema.expenseEntries.deletedAt),
      ),
    );

  if (!expense) throw new HTTPException(404, { message: 'Expense not found' });

  const updateData: Record<string, unknown> = { updatedAt: nowISO() };

  if (body.amount !== undefined) updateData.amountCents = toCents(body.amount);
  if (body.description !== undefined) updateData.description = body.description;
  if (body.merchantName !== undefined)
    updateData.merchantName = body.merchantName;

  if (body.categoryId !== undefined) {
    if (body.categoryId) {
      await assertCategoryVisible(db, user.id, body.categoryId);
    }
    updateData.categoryId = body.categoryId;
  }

  const oldWeekId = expense.weeklyBudgetAllocationId;
  let newWeekId = expense.weeklyBudgetAllocationId;

  if (body.expenseDate !== undefined) {
    updateData.expenseDate = body.expenseDate;
    const week = await findWeekForDate(
      db,
      expense.budgetPeriodId,
      body.expenseDate,
    );
    newWeekId = week?.id ?? null;
    updateData.weeklyBudgetAllocationId = newWeekId;
  }

  const oldAmountCents = expense.amountCents;
  const newAmountCents =
    body.amount !== undefined ? toCents(body.amount) : oldAmountCents;

  const queries: D1Query[] = [
    db
      .update(schema.expenseEntries)
      .set(updateData)
      .where(eq(schema.expenseEntries.id, id))
      .returning(),
  ];

  if (oldWeekId && oldWeekId !== newWeekId) {
    queries.push(buildWeekCacheUpdate(db, oldWeekId, -oldAmountCents));
  }

  if (newWeekId) {
    const delta =
      newWeekId === oldWeekId
        ? newAmountCents - oldAmountCents
        : newAmountCents;
    if (delta !== 0) {
      queries.push(buildWeekCacheUpdate(db, newWeekId, delta));
    }
  }

  const results = await db.batch(queries as [D1Query, ...D1Query[]]);
  const [updated] = results[0] as ExpenseRow[];

  return c.json(serializeExpense(updated));
});

expensesRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const id = c.req.param('id');

  const [expense] = await db
    .select()
    .from(schema.expenseEntries)
    .where(
      and(
        eq(schema.expenseEntries.id, id),
        eq(schema.expenseEntries.userId, user.id),
        isNull(schema.expenseEntries.deletedAt),
      ),
    );

  if (!expense) throw new HTTPException(404, { message: 'Expense not found' });

  const now = nowISO();

  const queries: D1Query[] = [
    db
      .update(schema.expenseEntries)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(schema.expenseEntries.id, id))
      .returning(),
  ];

  if (expense.weeklyBudgetAllocationId) {
    queries.push(
      buildWeekCacheUpdate(
        db,
        expense.weeklyBudgetAllocationId,
        -expense.amountCents,
      ),
    );
  }

  queries.push(
    db
      .update(schema.expenseEntryReceipts)
      .set({ deletedAt: now })
      .where(eq(schema.expenseEntryReceipts.expenseEntryId, id)),
  );

  const results = await db.batch(queries as [D1Query, ...D1Query[]]);
  const [deleted] = results[0] as ExpenseRow[];

  return c.json(deleted);
});

expensesRouter.post('/receipts/upload', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const e = env(c);

  const formData = await c.req.parseBody();
  const file = formData['file'] as File | undefined;
  if (!file) throw new HTTPException(400, { message: 'No file provided' });

  const receiptType =
    (formData['receiptType'] as string | undefined) ?? 'other';
  if (!['bank_transaction', 'retail', 'bill', 'other'].includes(receiptType)) {
    throw new HTTPException(400, { message: 'Invalid receipt type' });
  }

  const filename = `receipt-${Date.now()}-${Math.round(Math.random() * 10000)}-${file.name}`;
  const key = `receipts/${user.id}/${filename}`;

  if (e.R2) {
    await e.R2.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });
  }

  const [receipt] = await db
    .insert(schema.expenseEntryReceipts)
    .values({
      id: generateId(),
      userId: user.id,
      fileName: file.name,
      storagePath: key,
      receiptType: receiptType as
        | 'bank_transaction'
        | 'retail'
        | 'bill'
        | 'other',
      parseStatus: 'processing',
      isActive: true,
      createdAt: nowISO(),
    })
    .returning();

  if (e.RECEIPT_PROCESSING) {
    await e.RECEIPT_PROCESSING.send({
      receiptId: receipt.id,
      userId: user.id,
      fileName: file.name,
      storagePath: key,
    });
  }

  return c.json(receipt, 201);
});

expensesRouter.get('/receipts/:id/items', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const receiptId = c.req.param('id');

  const [receipt] = await db
    .select()
    .from(schema.expenseEntryReceipts)
    .where(
      and(
        eq(schema.expenseEntryReceipts.id, receiptId),
        eq(schema.expenseEntryReceipts.userId, user.id),
      ),
    );

  if (!receipt) throw new HTTPException(404, { message: 'Receipt not found' });

  const items = await db
    .select()
    .from(schema.receiptLineItems)
    .where(eq(schema.receiptLineItems.receiptId, receiptId))
    .orderBy(desc(schema.receiptLineItems.createdAt));

  return c.json(items);
});

expensesRouter.post(
  '/receipts/:id/confirm-items',
  validateJson(confirmReceiptItemsSchema),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const receiptId = c.req.param('id')!;
    const body = c.get('body') as unknown as ReturnType<
      typeof confirmReceiptItemsSchema.parse
    >;

    const [receipt] = await db
      .select()
      .from(schema.expenseEntryReceipts)
      .where(
        and(
          eq(schema.expenseEntryReceipts.id, receiptId),
          eq(schema.expenseEntryReceipts.userId, user.id),
        ),
      );

    if (!receipt)
      throw new HTTPException(404, { message: 'Receipt not found' });

    const budgetPeriod = await getActiveBudgetPeriod(db, user.id);

    const items = await db
      .select()
      .from(schema.receiptLineItems)
      .where(
        and(
          eq(schema.receiptLineItems.receiptId, receiptId),
          inArray(schema.receiptLineItems.id, body.itemIds),
        ),
      );

    const itemById = new Map(items.map((item) => [item.id, item]));
    const expenseDate = receipt.parsedExpenseDate ?? nowISO().split('T')[0];

    const week = await findWeekForDate(db, budgetPeriod.id, expenseDate);

    const now = nowISO();
    const expenseValues = [];
    const validItemIds: string[] = [];
    let weekDeltaCents = 0;

    for (const itemId of body.itemIds) {
      const item = itemById.get(itemId);
      if (!item || item.status !== 'suggested') continue;

      expenseValues.push({
        id: generateId(),
        userId: user.id,
        budgetPeriodId: budgetPeriod.id,
        weeklyBudgetAllocationId: week?.id ?? null,
        categoryId: item.categoryId ?? null,
        amountCents: item.totalPriceCents,
        expenseDate,
        description: item.name,
        sourceType: 'receipt_upload',
        merchantName: receipt.parsedMerchantName ?? null,
        receiptParseStatus: 'confirmed',
        createdAt: now,
        updatedAt: now,
      });
      validItemIds.push(itemId);
      weekDeltaCents += item.totalPriceCents;
    }

    if (expenseValues.length === 0) return c.json([], 201);

    const queries: D1Query[] = [
      db.insert(schema.expenseEntries).values(expenseValues).returning(),
      db
        .update(schema.receiptLineItems)
        .set({ status: 'confirmed', updatedAt: now })
        .where(inArray(schema.receiptLineItems.id, validItemIds)),
    ];

    if (week) {
      queries.push(buildWeekCacheUpdate(db, week.id, weekDeltaCents));
    }

    const results = await db.batch(queries as [D1Query, ...D1Query[]]);
    const createdExpenses = results[0] as ExpenseRow[];

    return c.json(createdExpenses, 201);
  },
);

expensesRouter.post('/receipts/:id/dismiss-item/:itemId', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const receiptId = c.req.param('id');
  const itemId = c.req.param('itemId');

  const [receipt] = await db
    .select()
    .from(schema.expenseEntryReceipts)
    .where(
      and(
        eq(schema.expenseEntryReceipts.id, receiptId),
        eq(schema.expenseEntryReceipts.userId, user.id),
      ),
    );

  if (!receipt) throw new HTTPException(404, { message: 'Receipt not found' });

  const [item] = await db
    .select()
    .from(schema.receiptLineItems)
    .where(
      and(
        eq(schema.receiptLineItems.id, itemId),
        eq(schema.receiptLineItems.receiptId, receiptId),
      ),
    );

  if (!item) throw new HTTPException(404, { message: 'Item not found' });

  await db
    .update(schema.receiptLineItems)
    .set({ status: 'dismissed', updatedAt: nowISO() })
    .where(eq(schema.receiptLineItems.id, itemId));

  return c.json({ success: true });
});
