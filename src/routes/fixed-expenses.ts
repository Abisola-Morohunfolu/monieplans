import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { and, desc, eq } from 'drizzle-orm';
import * as schema from '../database/schema';
import { generateId, nowISO, toCents } from '../shared/utils';
import { createFixedExpenseTemplateSchema, updateFixedExpenseTemplateSchema } from '../shared/schemas';
import { validateJson } from '../shared/validate';

export const fixedExpensesRouter = new Hono();

fixedExpensesRouter.post('/templates', validateJson(createFixedExpenseTemplateSchema), async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const body = c.get('body') as unknown as ReturnType<typeof createFixedExpenseTemplateSchema.parse>;

  if (body.categoryId) {
    const [category] = await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.id, body.categoryId!));
    if (!category) throw new HTTPException(404, { message: 'Category not found' });
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
      isProtectedFromCutRecommendations: body.isProtectedFromCutRecommendations ?? false,
      notes: body.notes ?? null,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    })
    .returning();

  return c.json(template, 201);
});

fixedExpensesRouter.get('/templates', async (c) => {
  const user = c.get('user');
  const db = c.get('db');

  const templates = await db
    .select()
    .from(schema.fixedExpenseTemplates)
    .where(eq(schema.fixedExpenseTemplates.userId, user.id))
    .orderBy(desc(schema.fixedExpenseTemplates.createdAt));

  return c.json(templates);
});

fixedExpensesRouter.get('/templates/:id', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const id = c.req.param('id')!;

  const [template] = await db
    .select()
    .from(schema.fixedExpenseTemplates)
    .where(and(eq(schema.fixedExpenseTemplates.userId, user.id), eq(schema.fixedExpenseTemplates.id, id)));

  if (!template) throw new HTTPException(404, { message: 'Fixed expense template not found' });
  return c.json(template);
});

fixedExpensesRouter.patch('/templates/:id', validateJson(updateFixedExpenseTemplateSchema), async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const id = c.req.param('id')!;
  const body = c.get('body') as unknown as ReturnType<typeof updateFixedExpenseTemplateSchema.parse>;

  const [template] = await db
    .select()
    .from(schema.fixedExpenseTemplates)
    .where(and(eq(schema.fixedExpenseTemplates.userId, user.id), eq(schema.fixedExpenseTemplates.id, id)));

  if (!template) throw new HTTPException(404, { message: 'Fixed expense template not found' });

  if (body.categoryId) {
    const [category] = await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.id, body.categoryId!));
    if (!category) throw new HTTPException(404, { message: 'Category not found' });
  }

  const [updated] = await db
    .update(schema.fixedExpenseTemplates)
    .set({
      name: body.name,
      categoryId: body.categoryId,
      amountCents: body.amount !== undefined ? toCents(body.amount) : undefined,
      cadence: body.cadence,
      defaultDueDay: body.defaultDueDay,
      isActive: body.isActive,
      isMandatory: body.isMandatory,
      isProtectedFromCutRecommendations: body.isProtectedFromCutRecommendations,
      notes: body.notes,
      updatedAt: nowISO(),
    })
    .where(eq(schema.fixedExpenseTemplates.id, id))
    .returning();

  return c.json(updated);
});

fixedExpensesRouter.delete('/templates/:id', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const id = c.req.param('id')!;

  const [template] = await db
    .select()
    .from(schema.fixedExpenseTemplates)
    .where(and(eq(schema.fixedExpenseTemplates.userId, user.id), eq(schema.fixedExpenseTemplates.id, id)));

  if (!template) throw new HTTPException(404, { message: 'Fixed expense template not found' });

  await db
    .delete(schema.fixedExpenseTemplates)
    .where(and(eq(schema.fixedExpenseTemplates.userId, user.id), eq(schema.fixedExpenseTemplates.id, id)));

  return c.json({ success: true });
});

fixedExpensesRouter.post('/generate-items/:budgetPeriodId', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const budgetPeriodId = c.req.param('budgetPeriodId')!;

  const [budgetPeriod] = await db
    .select()
    .from(schema.budgetPeriods)
    .where(and(eq(schema.budgetPeriods.id, budgetPeriodId), eq(schema.budgetPeriods.userId, user.id)));

  if (!budgetPeriod) throw new HTTPException(404, { message: 'Budget period not found' });

  const activeTemplates = await db
    .select()
    .from(schema.fixedExpenseTemplates)
    .where(and(eq(schema.fixedExpenseTemplates.userId, user.id), eq(schema.fixedExpenseTemplates.isActive, true)));

  if (activeTemplates.length === 0) return c.json([]);

  return db.transaction(async (tx) => {
    const itemsToInsert = activeTemplates.map((t) => {
      let dueDate: string | null = null;
      if (t.defaultDueDay && budgetPeriod.periodStartDate) {
        const d = new Date(budgetPeriod.periodStartDate);
        d.setDate(t.defaultDueDay);
        dueDate = d.toISOString().split('T')[0];
      }

      return {
        id: generateId(),
        userId: user.id,
        budgetPeriodId,
        fixedExpenseTemplateId: t.id,
        name: t.name,
        categoryId: t.categoryId,
        amountCents: t.amountCents,
        dueDate,
        originType: 'recurring_template',
        inclusionStatus: 'included',
        isMandatory: t.isMandatory,
        isProtectedFromCutRecommendations: t.isProtectedFromCutRecommendations,
        notes: t.notes,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
    });

    const items = await tx.insert(schema.fixedExpenseItems).values(itemsToInsert).returning();
    return c.json(items, 201);
  });
});
