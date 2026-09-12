import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { and, desc, eq, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import type { InferSelectModel } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
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

type D1Query = BatchItem<'sqlite'>;
type ExpenseRow = InferSelectModel<typeof schema.expenseEntries>;
type Db = DrizzleD1Database<typeof schema>;

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

  const [budgetPeriod] = await db
    .select()
    .from(schema.budgetPeriods)
    .where(
      and(
        eq(schema.budgetPeriods.userId, user.id),
        eq(schema.budgetPeriods.status, 'active'),
      ),
    )
    .orderBy(desc(schema.budgetPeriods.periodStartDate))
    .limit(1);

  if (!budgetPeriod) {
    throw new HTTPException(400, {
      message:
        'No active budget period found. Please activate a budget period first.',
    });
  }

  const [week] = await db
    .select()
    .from(schema.weeklyBudgetAllocations)
    .where(
      and(
        eq(schema.weeklyBudgetAllocations.budgetPeriodId, budgetPeriod.id),
        lte(schema.weeklyBudgetAllocations.weekStartDate, body.expenseDate),
        gte(schema.weeklyBudgetAllocations.weekEndDate, body.expenseDate),
      ),
    )
    .limit(1);

  const weeklyBudgetAllocationId = week ? week.id : null;

  if (body.categoryId) {
    const [cat] = await db
      .select()
      .from(schema.categories)
      .where(
        and(
          eq(schema.categories.id, body.categoryId),
          or(
            isNull(schema.categories.userId),
            eq(schema.categories.userId, user.id),
          ),
        ),
      );
    if (!cat) throw new HTTPException(404, { message: 'Category not found' });
  }

  let finalMerchantName = body.merchantName ?? null;
  let sourceType: string = 'manual';

  if (body.receiptId) {
    const [receipt] = await db
      .select()
      .from(schema.expenseEntryReceipts)
      .where(
        and(
          eq(schema.expenseEntryReceipts.id, body.receiptId),
          eq(schema.expenseEntryReceipts.userId, user.id),
          isNull(schema.expenseEntryReceipts.deletedAt),
        ),
      );
    if (!receipt)
      throw new HTTPException(404, { message: 'Receipt not found' });

    sourceType = 'receipt_upload';
    if (!finalMerchantName && receipt.parsedMerchantName) {
      finalMerchantName = receipt.parsedMerchantName;
    }
  }

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
        sourceType,
        merchantName: finalMerchantName,
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
    const cache = await computeWeekCacheUpdate(
      db,
      weeklyBudgetAllocationId,
      amountCents,
    );
    if (cache) {
      queries.push(
        db
          .update(schema.weeklyBudgetAllocations)
          .set(cache)
          .where(
            eq(schema.weeklyBudgetAllocations.id, weeklyBudgetAllocationId),
          ),
      );
    }
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
    );

  return c.json(expenses.map(serializeExpense));
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
      const [cat] = await db
        .select()
        .from(schema.categories)
        .where(
          and(
            eq(schema.categories.id, body.categoryId),
            or(
              isNull(schema.categories.userId),
              eq(schema.categories.userId, user.id),
            ),
          ),
        );
      if (!cat) throw new HTTPException(404, { message: 'Category not found' });
    }
    updateData.categoryId = body.categoryId;
  }

  const oldWeekId = expense.weeklyBudgetAllocationId;
  let newWeekId = expense.weeklyBudgetAllocationId;

  if (body.expenseDate !== undefined) {
    updateData.expenseDate = body.expenseDate;
    const [week] = await db
      .select()
      .from(schema.weeklyBudgetAllocations)
      .where(
        and(
          eq(
            schema.weeklyBudgetAllocations.budgetPeriodId,
            expense.budgetPeriodId,
          ),
          lte(schema.weeklyBudgetAllocations.weekStartDate, body.expenseDate),
          gte(schema.weeklyBudgetAllocations.weekEndDate, body.expenseDate),
        ),
      )
      .limit(1);

    newWeekId = week ? week.id : null;
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
    const cache = await computeWeekCacheUpdate(db, oldWeekId, -oldAmountCents);
    if (cache) {
      queries.push(
        db
          .update(schema.weeklyBudgetAllocations)
          .set(cache)
          .where(eq(schema.weeklyBudgetAllocations.id, oldWeekId)),
      );
    }
  }

  if (newWeekId) {
    const delta =
      newWeekId === oldWeekId
        ? newAmountCents - oldAmountCents
        : newAmountCents;
    if (delta !== 0) {
      const cache = await computeWeekCacheUpdate(db, newWeekId, delta);
      if (cache) {
        queries.push(
          db
            .update(schema.weeklyBudgetAllocations)
            .set(cache)
            .where(eq(schema.weeklyBudgetAllocations.id, newWeekId)),
        );
      }
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
    const cache = await computeWeekCacheUpdate(
      db,
      expense.weeklyBudgetAllocationId,
      -expense.amountCents,
    );
    if (cache) {
      queries.push(
        db
          .update(schema.weeklyBudgetAllocations)
          .set(cache)
          .where(
            eq(
              schema.weeklyBudgetAllocations.id,
              expense.weeklyBudgetAllocationId,
            ),
          ),
      );
    }
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

    const [budgetPeriod] = await db
      .select()
      .from(schema.budgetPeriods)
      .where(
        and(
          eq(schema.budgetPeriods.userId, user.id),
          eq(schema.budgetPeriods.status, 'active'),
        ),
      )
      .orderBy(desc(schema.budgetPeriods.periodStartDate))
      .limit(1);

    if (!budgetPeriod) {
      throw new HTTPException(400, {
        message: 'No active budget period found',
      });
    }

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

    const [week] = await db
      .select()
      .from(schema.weeklyBudgetAllocations)
      .where(
        and(
          eq(schema.weeklyBudgetAllocations.budgetPeriodId, budgetPeriod.id),
          lte(schema.weeklyBudgetAllocations.weekStartDate, expenseDate),
          gte(schema.weeklyBudgetAllocations.weekEndDate, expenseDate),
        ),
      )
      .limit(1);

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
      const cache = await computeWeekCacheUpdate(db, week.id, weekDeltaCents);
      if (cache) {
        queries.push(
          db
            .update(schema.weeklyBudgetAllocations)
            .set(cache)
            .where(eq(schema.weeklyBudgetAllocations.id, week.id)),
        );
      }
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

interface WeekCacheSet {
  actualSpentAmountCentsCache: number;
  remainingAmountCentsCache: number;
  updatedAt: string;
}

async function computeWeekCacheUpdate(
  db: Db,
  weekId: string,
  deltaCents: number,
): Promise<WeekCacheSet | null> {
  const [week] = await db
    .select()
    .from(schema.weeklyBudgetAllocations)
    .where(eq(schema.weeklyBudgetAllocations.id, weekId));

  if (!week) return null;

  const expenses = await db
    .select({ amountCents: schema.expenseEntries.amountCents })
    .from(schema.expenseEntries)
    .where(
      and(
        eq(schema.expenseEntries.weeklyBudgetAllocationId, weekId),
        isNull(schema.expenseEntries.deletedAt),
      ),
    );

  const existingSpent = expenses.reduce(
    (sum: number, e: { amountCents: number }) => sum + e.amountCents,
    0,
  );
  const totalSpentCents = existingSpent + deltaCents;
  const remainingCents = week.finalPlannedAmountCents - totalSpentCents;

  return {
    actualSpentAmountCentsCache: totalSpentCents,
    remainingAmountCentsCache: remainingCents,
    updatedAt: nowISO(),
  };
}
