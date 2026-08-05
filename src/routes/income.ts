import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { and, desc, eq, gte, isNull, lte, or, sql } from 'drizzle-orm';
import * as schema from '../database/schema';
import { generateId, nowISO, toCents } from '../shared/utils';
import { createIncomeSchema, listIncomeQuerySchema } from '../shared/schemas';
import { validateJson, validateQuery } from '../shared/validate';

export const incomeRouter = new Hono();

incomeRouter.post('/', validateJson(createIncomeSchema), async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const body = c.get('body') as unknown as ReturnType<
    typeof createIncomeSchema.parse
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
    throw new HTTPException(400, { message: 'No active budget period found' });
  }

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

  const [income] = await db
    .insert(schema.incomeEntries)
    .values({
      id: generateId(),
      userId: user.id,
      budgetPeriodId: budgetPeriod.id,
      categoryId: body.categoryId ?? null,
      amountCents: toCents(body.amount),
      incomeDate: body.incomeDate,
      description: body.description ?? null,
      sourceType: 'manual',
      createdAt: nowISO(),
      updatedAt: nowISO(),
    })
    .returning();

  return c.json(income, 201);
});

incomeRouter.get('/', validateQuery(listIncomeQuerySchema), async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const query = c.get('query') as unknown as ReturnType<
    typeof listIncomeQuerySchema.parse
  >;

  const conditions: ReturnType<typeof eq>[] = [
    eq(schema.incomeEntries.userId, user.id),
    isNull(schema.incomeEntries.deletedAt),
  ];

  if (query.budgetPeriodId) {
    conditions.push(
      eq(schema.incomeEntries.budgetPeriodId, query.budgetPeriodId),
    );
  }
  if (query.categoryId) {
    conditions.push(eq(schema.incomeEntries.categoryId, query.categoryId));
  }
  if (query.startDate) {
    conditions.push(gte(schema.incomeEntries.incomeDate, query.startDate));
  }
  if (query.endDate) {
    conditions.push(lte(schema.incomeEntries.incomeDate, query.endDate));
  }
  if (query.sourceType) {
    conditions.push(eq(schema.incomeEntries.sourceType, query.sourceType));
  }
  if (query.search) {
    const searchTerm = `%${query.search}%`;
    conditions.push(
      sql`LOWER(${schema.incomeEntries.description}) LIKE LOWER(${searchTerm})`,
    );
  }

  const income = await db
    .select({
      id: schema.incomeEntries.id,
      userId: schema.incomeEntries.userId,
      budgetPeriodId: schema.incomeEntries.budgetPeriodId,
      categoryId: schema.incomeEntries.categoryId,
      categoryName: schema.categories.name,
      transactionId: schema.incomeEntries.transactionId,
      amountCents: schema.incomeEntries.amountCents,
      incomeDate: schema.incomeEntries.incomeDate,
      description: schema.incomeEntries.description,
      sourceType: schema.incomeEntries.sourceType,
      createdAt: schema.incomeEntries.createdAt,
      updatedAt: schema.incomeEntries.updatedAt,
    })
    .from(schema.incomeEntries)
    .leftJoin(
      schema.categories,
      eq(schema.incomeEntries.categoryId, schema.categories.id),
    )
    .where(and(...conditions))
    .orderBy(
      desc(schema.incomeEntries.incomeDate),
      desc(schema.incomeEntries.createdAt),
    );

  return c.json(income);
});

incomeRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const id = c.req.param('id');

  const [entry] = await db
    .select()
    .from(schema.incomeEntries)
    .where(
      and(
        eq(schema.incomeEntries.id, id),
        eq(schema.incomeEntries.userId, user.id),
        isNull(schema.incomeEntries.deletedAt),
      ),
    );

  if (!entry)
    throw new HTTPException(404, { message: 'Income entry not found' });

  const now = nowISO();
  await db
    .update(schema.incomeEntries)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(schema.incomeEntries.id, id));

  return c.json({ success: true });
});
