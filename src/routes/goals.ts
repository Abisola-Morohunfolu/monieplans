import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { and, desc, eq } from 'drizzle-orm';
import * as schema from '../database/schema';
import { generateId, nowISO, toCents, fromCents } from '../shared/utils';
import {
  createGoalSchema,
  updateGoalSchema,
  reserveGoalSchema,
} from '../shared/schemas';
import { validateJson } from '../shared/validate';

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

  return c.json(goal, 201);
});

goalsRouter.get('/', async (c) => {
  const user = c.get('user');
  const db = c.get('db');

  const goals = await db
    .select()
    .from(schema.savingsGoals)
    .where(eq(schema.savingsGoals.userId, user.id))
    .orderBy(
      schema.savingsGoals.priorityRank,
      desc(schema.savingsGoals.createdAt),
    );

  return c.json(goals);
});

goalsRouter.get('/reservations/:budgetPeriodId', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const budgetPeriodId = c.req.param('budgetPeriodId');

  const [period] = await db
    .select()
    .from(schema.budgetPeriods)
    .where(
      and(
        eq(schema.budgetPeriods.id, budgetPeriodId),
        eq(schema.budgetPeriods.userId, user.id),
      ),
    );

  if (!period)
    throw new HTTPException(404, { message: 'Budget period not found' });

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
  return c.json(goal);
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

  return c.json(updated);
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

  return c.json(updated);
});

goalsRouter.post(
  '/reserve/:budgetPeriodId',
  validateJson(reserveGoalSchema),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const budgetPeriodId = c.req.param('budgetPeriodId')!;

    const [period] = await db
      .select()
      .from(schema.budgetPeriods)
      .where(
        and(
          eq(schema.budgetPeriods.id, budgetPeriodId),
          eq(schema.budgetPeriods.userId, user.id),
        ),
      );

    if (!period)
      throw new HTTPException(404, { message: 'Budget period not found' });

    return db.transaction(async (tx) => {
      const reservations = [];
      const body = c.get('body') as unknown as ReturnType<
        typeof reserveGoalSchema.parse
      >;

      for (const r of body.reservations) {
        const [reservation] = await tx
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
              reservedAmountCents: toCents(r.reservedAmount),
              recommendedAmountCents: toCents(r.reservedAmount),
              updatedAt: nowISO(),
            },
          })
          .returning();
        reservations.push(reservation);
      }

      return c.json(reservations, 201);
    });
  },
);
