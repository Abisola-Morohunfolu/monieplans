import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import * as schema from '../database/schema';
import { generateId, nowISO } from '../shared/utils';
import { serializeTransaction } from '../shared/serializers';
import {
  listTransactionsQuerySchema,
  updateTransactionCategorySchema,
  paginationQuerySchema,
} from '../shared/schemas';
import { validateJson, validateQuery } from '../shared/validate';
import {
  assertCategoryVisible,
  buildWeekCacheUpdate,
  findWeekForDate,
  getBudgetPeriodOrThrow,
  type Db,
  type D1Query,
} from './helpers';
import { paginated, resolveLimitOffset } from '../shared/pagination';

const env = (c: { env: unknown }) =>
  c.env as {
    DB: D1Database;
    R2: R2Bucket;
    RECEIPT_PROCESSING: Queue;
    STATEMENT_PROCESSING: Queue;
  };

async function getConvertedMaps(
  db: Db,
  txnIds: string[],
): Promise<{ expense: Map<string, string>; income: Map<string, string> }> {
  const expense = new Map<string, string>();
  const income = new Map<string, string>();
  if (txnIds.length === 0) return { expense, income };

  const expenses = await db
    .select({
      id: schema.expenseEntries.id,
      transactionId: schema.expenseEntries.transactionId,
    })
    .from(schema.expenseEntries)
    .where(inArray(schema.expenseEntries.transactionId, txnIds));
  for (const e of expenses) {
    if (e.transactionId) expense.set(e.transactionId, e.id);
  }

  const incomes = await db
    .select({
      id: schema.incomeEntries.id,
      transactionId: schema.incomeEntries.transactionId,
    })
    .from(schema.incomeEntries)
    .where(inArray(schema.incomeEntries.transactionId, txnIds));
  for (const i of incomes) {
    if (i.transactionId) income.set(i.transactionId, i.id);
  }

  return { expense, income };
}

export const statementsRouter = new Hono();

statementsRouter.get('/', validateQuery(paginationQuerySchema), async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const query = c.get('query') as unknown as ReturnType<
    typeof paginationQuerySchema.parse
  >;
  const { limit, offset } = resolveLimitOffset(query);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.statementUploads)
    .where(eq(schema.statementUploads.userId, user.id));
  const total = Number(countRow?.count ?? 0);

  const statements = await db
    .select()
    .from(schema.statementUploads)
    .where(eq(schema.statementUploads.userId, user.id))
    .orderBy(desc(schema.statementUploads.uploadedAt))
    .limit(limit)
    .offset(offset);

  return c.json(paginated(statements, total, limit, offset));
});

statementsRouter.get(
  '/transactions',
  validateQuery(listTransactionsQuerySchema),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const query = c.get('query') as unknown as ReturnType<
      typeof listTransactionsQuerySchema.parse
    >;
    const { limit, offset } = resolveLimitOffset(query);

    const conditions: ReturnType<typeof eq>[] = [
      eq(schema.transactions.userId, user.id),
    ];

    if (query.hideInternal !== 'false') {
      conditions.push(eq(schema.transactions.isInternalBookkeeping, false));
    }

    if (query.transactionType) {
      conditions.push(
        eq(schema.transactions.transactionType, query.transactionType),
      );
    }

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.transactions)
      .where(and(...conditions));
    const total = Number(countRow?.count ?? 0);

    const transactions = await db
      .select({
        id: schema.transactions.id,
        statementUploadId: schema.transactions.statementUploadId,
        postedDate: schema.transactions.postedDate,
        descriptionNormalized: schema.transactions.descriptionNormalized,
        descriptionRaw: schema.transactions.descriptionRaw,
        amountCents: schema.transactions.amountCents,
        currency: schema.transactions.currency,
        direction: schema.transactions.direction,
        merchantName: schema.transactions.merchantName,
        categoryId: schema.transactions.categoryId,
        categoryName: schema.categories.name,
        isUserCorrected: schema.transactions.isUserCorrected,
        transactionType: schema.transactions.transactionType,
        createdAt: schema.transactions.createdAt,
      })
      .from(schema.transactions)
      .leftJoin(
        schema.categories,
        eq(schema.transactions.categoryId, schema.categories.id),
      )
      .where(and(...conditions))
      .orderBy(desc(schema.transactions.postedDate))
      .limit(limit)
      .offset(offset);

    const txnIds = transactions.map((t) => t.id);
    const { expense: convertedToExpense, income: convertedToIncome } =
      await getConvertedMaps(db, txnIds);

    return c.json(
      paginated(
        transactions.map((t) => ({
          ...serializeTransaction(t),
          convertedToExpenseId: convertedToExpense.get(t.id) ?? null,
          convertedToIncomeId: convertedToIncome.get(t.id) ?? null,
        })),
        total,
        limit,
        offset,
      ),
    );
  },
);

statementsRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const id = c.req.param('id');

  const [statement] = await db
    .select()
    .from(schema.statementUploads)
    .where(
      and(
        eq(schema.statementUploads.id, id),
        eq(schema.statementUploads.userId, user.id),
      ),
    );

  if (!statement)
    throw new HTTPException(404, { message: 'Statement not found' });
  return c.json(statement);
});

statementsRouter.get(
  '/:id/transactions',
  validateQuery(listTransactionsQuerySchema),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const id = c.req.param('id')!;
    const query = c.get('query') as unknown as ReturnType<
      typeof listTransactionsQuerySchema.parse
    >;
    const { limit, offset } = resolveLimitOffset(query);

    const conditions: ReturnType<typeof eq>[] = [
      eq(schema.transactions.statementUploadId, id),
      eq(schema.transactions.userId, user.id),
    ];

    if (query.hideInternal !== 'false') {
      conditions.push(eq(schema.transactions.isInternalBookkeeping, false));
    }

    if (query.transactionType) {
      conditions.push(
        eq(schema.transactions.transactionType, query.transactionType),
      );
    }

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.transactions)
      .where(and(...conditions));
    const total = Number(countRow?.count ?? 0);

    const transactions = await db
      .select({
        id: schema.transactions.id,
        postedDate: schema.transactions.postedDate,
        descriptionNormalized: schema.transactions.descriptionNormalized,
        descriptionRaw: schema.transactions.descriptionRaw,
        amountCents: schema.transactions.amountCents,
        currency: schema.transactions.currency,
        direction: schema.transactions.direction,
        merchantName: schema.transactions.merchantName,
        categoryId: schema.transactions.categoryId,
        categoryName: schema.categories.name,
        isUserCorrected: schema.transactions.isUserCorrected,
        transactionType: schema.transactions.transactionType,
        createdAt: schema.transactions.createdAt,
      })
      .from(schema.transactions)
      .leftJoin(
        schema.categories,
        eq(schema.transactions.categoryId, schema.categories.id),
      )
      .where(and(...conditions))
      .orderBy(desc(schema.transactions.postedDate))
      .limit(limit)
      .offset(offset);

    const txnIds = transactions.map((t) => t.id);
    const { expense: convertedToExpense, income: convertedToIncome } =
      await getConvertedMaps(db, txnIds);

    return c.json(
      paginated(
        transactions.map((t) => ({
          ...serializeTransaction(t),
          convertedToExpenseId: convertedToExpense.get(t.id) ?? null,
          convertedToIncomeId: convertedToIncome.get(t.id) ?? null,
        })),
        total,
        limit,
        offset,
      ),
    );
  },
);

statementsRouter.patch(
  '/transactions/:id',
  validateJson(updateTransactionCategorySchema),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const txnId = c.req.param('id')!;
    const body = c.get('body') as unknown as ReturnType<
      typeof updateTransactionCategorySchema.parse
    >;

    const [transaction] = await db
      .select()
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.id, txnId),
          eq(schema.transactions.userId, user.id),
        ),
      );

    if (!transaction)
      throw new HTTPException(404, { message: 'Transaction not found' });

    if (body.categoryId) {
      await assertCategoryVisible(db, user.id, body.categoryId);
    }

    const [updated] = await db
      .update(schema.transactions)
      .set({
        categoryId: body.categoryId,
        isUserCorrected: true,
        categoryConfidence: body.categoryId ? 100 : null,
        updatedAt: nowISO(),
      })
      .where(eq(schema.transactions.id, txnId))
      .returning();

    if (body.categoryId) {
      const merchant = (transaction.merchantName ?? '').trim().toLowerCase();
      const matchType = merchant ? 'merchant' : 'contains_text';
      const matchValue =
        merchant ||
        (transaction.descriptionNormalized ?? transaction.descriptionRaw)
          .trim()
          .toLowerCase();

      if (matchValue) {
        await db
          .insert(schema.transactionCategoryRules)
          .values({
            id: generateId(),
            userId: user.id,
            matchType,
            matchValue,
            categoryId: body.categoryId,
            priority: 0,
            createdFromTransactionId: transaction.id,
            createdAt: nowISO(),
            updatedAt: nowISO(),
          })
          .onConflictDoNothing();
      }
    }

    return c.json(serializeTransaction(updated));
  },
);

statementsRouter.post('/upload', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const e = env(c);

  const formData = await c.req.parseBody();
  const file = formData['file'] as File | undefined;
  if (!file) return c.json({ error: 'No file provided' }, 400);

  const rawBudgetPeriodId = formData['budgetPeriodId'] as string | undefined;
  const budgetPeriodId = rawBudgetPeriodId?.trim() ? rawBudgetPeriodId : null;
  if (budgetPeriodId) {
    await getBudgetPeriodOrThrow(db, user.id, budgetPeriodId);
  }

  const filename = `statement-${Date.now()}-${Math.round(Math.random() * 10000)}-${file.name}`;
  const key = `statements/${user.id}/${filename}`;

  if (e.R2) {
    await e.R2.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });
  }

  const [upload] = await db
    .insert(schema.statementUploads)
    .values({
      id: generateId(),
      userId: user.id,
      budgetPeriodId,
      fileName: file.name,
      fileType: file.type,
      storagePath: key,
      uploadStatus: 'uploaded',
      uploadedAt: nowISO(),
    })
    .returning();

  if (e.STATEMENT_PROCESSING) {
    await e.STATEMENT_PROCESSING.send({
      uploadId: upload.id,
      userId: user.id,
      budgetPeriodId,
      fileName: file.name,
      storagePath: key,
    });
  }

  return c.json(upload, 201);
});

statementsRouter.post('/transactions/:id/convert-to-expense', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const txnId = c.req.param('id');

  const [transaction] = await db
    .select()
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.id, txnId),
        eq(schema.transactions.userId, user.id),
      ),
    );

  if (!transaction)
    throw new HTTPException(404, { message: 'Transaction not found' });
  if (transaction.direction !== 'debit') {
    throw new HTTPException(400, {
      message: 'Only debit transactions can be converted to expenses',
    });
  }

  const [existing] = await db
    .select({ id: schema.expenseEntries.id })
    .from(schema.expenseEntries)
    .where(eq(schema.expenseEntries.transactionId, txnId));
  if (existing) {
    throw new HTTPException(409, {
      message: 'Transaction already converted to an expense',
    });
  }

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
    throw new HTTPException(400, { message: 'No active budget period found' });
  }

  const expenseDate = transaction.postedDate.split('T')[0];
  const week = await findWeekForDate(db, budgetPeriod.id, expenseDate);

  const queries: D1Query[] = [
    db
      .insert(schema.expenseEntries)
      .values({
        id: generateId(),
        userId: user.id,
        budgetPeriodId: budgetPeriod.id,
        weeklyBudgetAllocationId: week?.id ?? null,
        transactionId: transaction.id,
        categoryId: transaction.categoryId ?? null,
        amountCents: transaction.amountCents,
        expenseDate,
        description: transaction.descriptionRaw,
        sourceType: 'statement_import',
        merchantName: transaction.merchantName ?? null,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      })
      .returning(),
  ];

  if (week) {
    queries.push(buildWeekCacheUpdate(db, week.id, transaction.amountCents));
  }

  const results = await db.batch(queries as [D1Query, ...D1Query[]]);
  const [expense] = results[0] as InferSelectModel<
    typeof schema.expenseEntries
  >[];

  return c.json(expense, 201);
});

statementsRouter.post('/transactions/:id/convert-to-income', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const txnId = c.req.param('id');

  const [transaction] = await db
    .select()
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.id, txnId),
        eq(schema.transactions.userId, user.id),
      ),
    );

  if (!transaction)
    throw new HTTPException(404, { message: 'Transaction not found' });
  if (transaction.direction !== 'credit') {
    throw new HTTPException(400, {
      message: 'Only credit transactions can be converted to income',
    });
  }

  const [existing] = await db
    .select({ id: schema.incomeEntries.id })
    .from(schema.incomeEntries)
    .where(eq(schema.incomeEntries.transactionId, txnId));
  if (existing) {
    throw new HTTPException(409, {
      message: 'Transaction already converted to income',
    });
  }

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
    throw new HTTPException(400, { message: 'No active budget period found' });
  }

  const [income] = await db
    .insert(schema.incomeEntries)
    .values({
      id: generateId(),
      userId: user.id,
      budgetPeriodId: budgetPeriod.id,
      transactionId: transaction.id,
      categoryId: transaction.categoryId ?? null,
      amountCents: transaction.amountCents,
      incomeDate: transaction.postedDate,
      description: transaction.descriptionRaw,
      sourceType: 'statement_import',
      createdAt: nowISO(),
      updatedAt: nowISO(),
    })
    .returning();

  return c.json(income, 201);
});
