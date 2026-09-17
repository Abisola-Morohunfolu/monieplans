import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { and, desc, eq, sql } from 'drizzle-orm';
import * as schema from '../database/schema';
import { generateId, nowISO, toCents } from '../shared/utils';
import { serializeFixedExpenseTemplate } from '../shared/serializers';
import {
  createFixedExpenseTemplateSchema,
  updateFixedExpenseTemplateSchema,
  paginationQuerySchema,
} from '../shared/schemas';
import { validateJson, validateQuery } from '../shared/validate';
import {
  assertCategoryVisible,
  getBudgetPeriodOrThrow,
  generateFixedExpenseItemsForPeriod,
} from './helpers';
import { paginated, resolveLimitOffset } from '../shared/pagination';

export const fixedExpensesRouter = new Hono();

fixedExpensesRouter.post(
  '/templates',
  validateJson(createFixedExpenseTemplateSchema),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const body = c.get('body') as unknown as ReturnType<
      typeof createFixedExpenseTemplateSchema.parse
    >;

    if (body.categoryId) {
      await assertCategoryVisible(db, user.id, body.categoryId);
    }

    const [template] = await db
      .insert(schema.fixedExpenseTemplates)
      .values({
        id: generateId(),
        userId: user.id,
        name: body.name,
        categoryId: body.categoryId ?? null,
        amountCents: toCents(body.amount),
        cadence: body.cadence,
        defaultDueDay: body.defaultDueDay ?? null,
        isActive: body.isActive ?? true,
        isMandatory: body.isMandatory ?? false,
        isProtectedFromCutRecommendations:
          body.isProtectedFromCutRecommendations ?? false,
        notes: body.notes ?? null,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      })
      .returning();

    return c.json(serializeFixedExpenseTemplate(template), 201);
  },
);

fixedExpensesRouter.get(
  '/templates',
  validateQuery(paginationQuerySchema),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const query = c.get('query') as unknown as ReturnType<
      typeof paginationQuerySchema.parse
    >;
    const { limit, offset } = resolveLimitOffset(query);

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.fixedExpenseTemplates)
      .where(eq(schema.fixedExpenseTemplates.userId, user.id));
    const total = Number(countRow?.count ?? 0);

    const templates = await db
      .select({
        id: schema.fixedExpenseTemplates.id,
        name: schema.fixedExpenseTemplates.name,
        amountCents: schema.fixedExpenseTemplates.amountCents,
        categoryId: schema.fixedExpenseTemplates.categoryId,
        categoryName: schema.categories.name,
        cadence: schema.fixedExpenseTemplates.cadence,
        defaultDueDay: schema.fixedExpenseTemplates.defaultDueDay,
        createdAt: schema.fixedExpenseTemplates.createdAt,
        updatedAt: schema.fixedExpenseTemplates.updatedAt,
      })
      .from(schema.fixedExpenseTemplates)
      .leftJoin(
        schema.categories,
        eq(schema.fixedExpenseTemplates.categoryId, schema.categories.id),
      )
      .where(eq(schema.fixedExpenseTemplates.userId, user.id))
      .orderBy(desc(schema.fixedExpenseTemplates.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json(
      paginated(
        templates.map(serializeFixedExpenseTemplate),
        total,
        limit,
        offset,
      ),
    );
  },
);

fixedExpensesRouter.get('/templates/:id', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const id = c.req.param('id');

  const [template] = await db
    .select({
      id: schema.fixedExpenseTemplates.id,
      name: schema.fixedExpenseTemplates.name,
      amountCents: schema.fixedExpenseTemplates.amountCents,
      categoryId: schema.fixedExpenseTemplates.categoryId,
      categoryName: schema.categories.name,
      cadence: schema.fixedExpenseTemplates.cadence,
      defaultDueDay: schema.fixedExpenseTemplates.defaultDueDay,
      createdAt: schema.fixedExpenseTemplates.createdAt,
      updatedAt: schema.fixedExpenseTemplates.updatedAt,
    })
    .from(schema.fixedExpenseTemplates)
    .leftJoin(
      schema.categories,
      eq(schema.fixedExpenseTemplates.categoryId, schema.categories.id),
    )
    .where(
      and(
        eq(schema.fixedExpenseTemplates.userId, user.id),
        eq(schema.fixedExpenseTemplates.id, id),
      ),
    );

  if (!template)
    throw new HTTPException(404, {
      message: 'Fixed expense template not found',
    });
  return c.json(serializeFixedExpenseTemplate(template));
});

fixedExpensesRouter.patch(
  '/templates/:id',
  validateJson(updateFixedExpenseTemplateSchema),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const id = c.req.param('id')!;
    const body = c.get('body') as unknown as ReturnType<
      typeof updateFixedExpenseTemplateSchema.parse
    >;

    const [template] = await db
      .select()
      .from(schema.fixedExpenseTemplates)
      .where(
        and(
          eq(schema.fixedExpenseTemplates.userId, user.id),
          eq(schema.fixedExpenseTemplates.id, id),
        ),
      );

    if (!template)
      throw new HTTPException(404, {
        message: 'Fixed expense template not found',
      });

    if (body.categoryId) {
      await assertCategoryVisible(db, user.id, body.categoryId);
    }

    const [updated] = await db
      .update(schema.fixedExpenseTemplates)
      .set({
        name: body.name,
        categoryId: body.categoryId,
        amountCents:
          body.amount !== undefined ? toCents(body.amount) : undefined,
        cadence: body.cadence,
        defaultDueDay: body.defaultDueDay,
        isActive: body.isActive,
        isMandatory: body.isMandatory,
        isProtectedFromCutRecommendations:
          body.isProtectedFromCutRecommendations,
        notes: body.notes,
        updatedAt: nowISO(),
      })
      .where(eq(schema.fixedExpenseTemplates.id, id))
      .returning();

    return c.json(serializeFixedExpenseTemplate(updated));
  },
);

fixedExpensesRouter.delete('/templates/:id', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const id = c.req.param('id');

  const [template] = await db
    .select()
    .from(schema.fixedExpenseTemplates)
    .where(
      and(
        eq(schema.fixedExpenseTemplates.userId, user.id),
        eq(schema.fixedExpenseTemplates.id, id),
      ),
    );

  if (!template)
    throw new HTTPException(404, {
      message: 'Fixed expense template not found',
    });

  await db
    .delete(schema.fixedExpenseTemplates)
    .where(
      and(
        eq(schema.fixedExpenseTemplates.userId, user.id),
        eq(schema.fixedExpenseTemplates.id, id),
      ),
    );

  return c.json({ success: true });
});

fixedExpensesRouter.post('/generate-items/:budgetPeriodId', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const budgetPeriodId = c.req.param('budgetPeriodId');

  const budgetPeriod = await getBudgetPeriodOrThrow(
    db,
    user.id,
    budgetPeriodId,
  );

  const items = await generateFixedExpenseItemsForPeriod(
    db,
    user.id,
    budgetPeriod,
  );

  return c.json(items, 201);
});
