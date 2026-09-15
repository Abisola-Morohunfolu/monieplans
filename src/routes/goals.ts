import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { and, desc, eq, sql } from 'drizzle-orm';
import * as schema from '../database/schema';

import { generateId, nowISO, toCents } from '../shared/utils';
import { serializeGoal } from '../shared/serializers';
import {
  createGoalSchema,
  updateGoalSchema,
  reserveGoalSchema,
  paginationQuerySchema,
} from '../shared/schemas';
import { validateJson, validateQuery } from '../shared/validate';
import { getBudgetPeriodOrThrow, type D1Query } from './helpers';
import { paginated, resolveLimitOffset } from '../shared/pagination';

export const goalsRouter = new Hono();

goalsRouter.post('/', validateJson(createGoalSchema), async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const body = c.get('body') as unknown as ReturnType<
    typeof createGoalSchema.parse
  >;

  const [goal] = await db
    .insert(schema.savingsGoals)
    .values({
      id: generateId(),
      userId: user.id,
      name: body.name,
      targetAmountCents: toCents(body.targetAmount),
      currentSavedAmountCents: 0,
      targetDate: body.targetDate ?? null,
      priorityRank: body.priorityRank ?? 0,
      reserveInBudget: body.reserveInBudget ?? false,
      notes: body.notes ?? null,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    })
    .returning();

  return c.json(serializeGoal(goal), 201);
});

goalsRouter.get('/', validateQuery(paginationQuerySchema), async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const query = c.get('query') as unknown as ReturnType<
    typeof paginationQuerySchema.parse
  >;
  const { limit, offset } = resolveLimitOffset(query);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.savingsGoals)
    .where(eq(schema.savingsGoals.userId, user.id));
  const total = Number(countRow?.count ?? 0);

  const goals = await db
    .select()
    .from(schema.savingsGoals)
    .where(eq(schema.savingsGoals.userId, user.id))
    .orderBy(
      schema.savingsGoals.priorityRank,
      desc(schema.savingsGoals.createdAt),
    )
    .limit(limit)
    .offset(offset);

  return c.json(paginated(goals.map(serializeGoal), total, limit, offset));
});

goalsRouter.get('/reservations/:budgetPeriodId', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const budgetPeriodId = c.req.param('budgetPeriodId');

  await getBudgetPeriodOrThrow(db, user.id, budgetPeriodId);

  const reservations = await db
    .select()
    .from(schema.goalBudgetReservations)
    .where(eq(schema.goalBudgetReservations.budgetPeriodId, budgetPeriodId));

  return c.json(reservations);
});

goalsRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const id = c.req.param('id');

  const [goal] = await db
    .select()
    .from(schema.savingsGoals)
    .where(
      and(
        eq(schema.savingsGoals.userId, user.id),
        eq(schema.savingsGoals.id, id),
      ),
    );

  if (!goal)
    throw new HTTPException(404, { message: 'Savings goal not found' });
  return c.json(serializeGoal(goal));
});

goalsRouter.patch('/:id', validateJson(updateGoalSchema), async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const id = c.req.param('id')!;
  const body = c.get('body') as unknown as ReturnType<
    typeof updateGoalSchema.parse
  >;

  const [goal] = await db
    .select()
    .from(schema.savingsGoals)
    .where(
      and(
        eq(schema.savingsGoals.userId, user.id),
        eq(schema.savingsGoals.id, id),
      ),
    );

  if (!goal)
    throw new HTTPException(404, { message: 'Savings goal not found' });

  const setValues: Record<string, unknown> = { updatedAt: nowISO() };
  if (body.name !== undefined) setValues.name = body.name;
  if (body.targetAmount !== undefined)
    setValues.targetAmountCents = toCents(body.targetAmount);
  if (body.targetDate !== undefined) setValues.targetDate = body.targetDate;
  if (body.priorityRank !== undefined)
    setValues.priorityRank = body.priorityRank;
  if (body.reserveInBudget !== undefined)
    setValues.reserveInBudget = body.reserveInBudget;
  if (body.notes !== undefined) setValues.notes = body.notes;
  if (body.status !== undefined) setValues.status = body.status;

  const [updated] = await db
    .update(schema.savingsGoals)
    .set(setValues)
    .where(
      and(
        eq(schema.savingsGoals.userId, user.id),
        eq(schema.savingsGoals.id, id),
      ),
    )
    .returning();

  return c.json(serializeGoal(updated));
});

goalsRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const id = c.req.param('id');

  const [goal] = await db
    .select()
    .from(schema.savingsGoals)
    .where(
      and(
        eq(schema.savingsGoals.userId, user.id),
        eq(schema.savingsGoals.id, id),
      ),
    );

  if (!goal)
    throw new HTTPException(404, { message: 'Savings goal not found' });

  const [updated] = await db
    .update(schema.savingsGoals)
    .set({ status: 'archived', updatedAt: nowISO() })
    .where(
      and(
        eq(schema.savingsGoals.userId, user.id),
        eq(schema.savingsGoals.id, id),
      ),
    )
    .returning();

  return c.json(serializeGoal(updated));
});

goalsRouter.post(
  '/reserve/:budgetPeriodId',
  validateJson(reserveGoalSchema),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const budgetPeriodId = c.req.param('budgetPeriodId')!;

    await getBudgetPeriodOrThrow(db, user.id, budgetPeriodId);

    const body = c.get('body') as unknown as ReturnType<
      typeof reserveGoalSchema.parse
    >;

    if (body.reservations.length === 0) return c.json([], 201);

    const queries: D1Query[] = body.reservations.map((r) =>
      db
        .insert(schema.goalBudgetReservations)
        .values({
          id: generateId(),
          budgetPeriodId,
          goalId: r.goalId,
          reservedAmountCents: toCents(r.reservedAmount),
          recommendedAmountCents: toCents(r.reservedAmount),
          feasibilityStatus: 'on_track',
          createdAt: nowISO(),
          updatedAt: nowISO(),
        })
        .onConflictDoUpdate({
          target: [
            schema.goalBudgetReservations.budgetPeriodId,
            schema.goalBudgetReservations.goalId,
          ],
          set: {
            reservedAmountCents: sql`excluded.reserved_amount_cents`,
            recommendedAmountCents: sql`excluded.recommended_amount_cents`,
            updatedAt: sql`excluded.updated_at`,
          },
        })
        .returning(),
    );

    const results = await db.batch(queries as [D1Query, ...D1Query[]]);
    const reservations = results.map((r) => (r as unknown[])[0]);

    return c.json(reservations, 201);
  },
);
