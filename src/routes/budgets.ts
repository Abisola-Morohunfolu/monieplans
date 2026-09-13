import { Hono } from 'hono';
import { generateId, nowISO, toCents, fromCents } from '../shared/utils';
import { serializeBudget } from '../shared/serializers';
import { createBudgetSchema } from '../shared/schemas';
import { validateJson } from '../shared/validate';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import * as schema from '../database/schema';
import { getBudgetPeriodOrThrow, type D1Query, type Db } from './helpers';

type BudgetPeriodRow = InferSelectModel<typeof schema.budgetPeriods>;

export const budgetsRouter = new Hono();

budgetsRouter.post('/', validateJson(createBudgetSchema), async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const body = c.get('body') as unknown as ReturnType<
    typeof createBudgetSchema.parse
  >;
  const now = nowISO();
  const status = body.activateImmediately ? 'active' : 'draft';
  const periodId = generateId();

  const queries: D1Query[] = [
    db
      .insert(schema.budgetPeriods)
      .values({
        id: periodId,
        userId: user.id,
        periodStartDate: body.periodStartDate,
        periodEndDate: body.periodEndDate,
        cycleType: body.cycleType ?? 'calendar_month',
        presetMonth: body.presetMonth,
        planningMode: body.planningMode,
        monthlyIncomeAmountCents:
          body.monthlyIncomeAmount != null
            ? toCents(body.monthlyIncomeAmount)
            : null,
        monthlyBudgetCapAmountCents:
          body.monthlyBudgetCapAmount != null
            ? toCents(body.monthlyBudgetCapAmount)
            : null,
        currency: body.currency,
        notes: body.notes,
        status,
        createdAt: now,
        updatedAt: now,
      })
      .returning(),
  ];

  if (body.activateImmediately) {
    const totalCents =
      body.monthlyBudgetCapAmount != null
        ? toCents(body.monthlyBudgetCapAmount)
        : body.monthlyIncomeAmount != null
          ? toCents(body.monthlyIncomeAmount)
          : 0;
    const totalAmount = fromCents(totalCents);
    const rows = buildWeeklyAllocationRows(
      user.id,
      periodId,
      body.periodStartDate,
      body.periodEndDate,
      totalAmount,
    );
    if (rows.length > 0) {
      queries.push(
        db
          .insert(schema.weeklyBudgetAllocations)
          .values(rows)
          .onConflictDoNothing(),
      );
    }
  }

  const results = await db.batch(queries as [D1Query, ...D1Query[]]);
  const [period] = results[0] as BudgetPeriodRow[];

  return c.json(serializeBudget(period), 201);
});

budgetsRouter.get('/', async (c) => {
  const user = c.get('user');
  const db = c.get('db');

  const periods = await db
    .select()
    .from(schema.budgetPeriods)
    .where(eq(schema.budgetPeriods.userId, user.id))
    .orderBy(desc(schema.budgetPeriods.periodStartDate));

  return c.json(periods.map(serializeBudget));
});

budgetsRouter.get('/active', async (c) => {
  const user = c.get('user');
  const db = c.get('db');

  const [period] = await db
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

  return c.json(period ? serializeBudget(period) : null);
});

budgetsRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const id = c.req.param('id');

  const period = await getBudgetPeriodOrThrow(db, user.id, id);

  return c.json(serializeBudget(period));
});

budgetsRouter.post('/:id/activate', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const id = c.req.param('id');
  const now = nowISO();

  const period = await getBudgetPeriodOrThrow(db, user.id, id);
  if (period.status === 'active') return c.json(serializeBudget(period));

  const totalCents =
    period.monthlyBudgetCapAmountCents ?? period.monthlyIncomeAmountCents ?? 0;
  const totalAmount = fromCents(totalCents);

  const { values: reservationValues, totalReservedCents } =
    await buildGoalReservations(db, user.id, id, totalAmount);

  const allocRows = buildWeeklyAllocationRows(
    user.id,
    id,
    period.periodStartDate,
    period.periodEndDate,
    totalAmount,
    'equal_split',
    totalReservedCents,
  );

  const queries: D1Query[] = [
    db
      .update(schema.budgetPeriods)
      .set({ status: 'active', updatedAt: now })
      .where(
        and(
          eq(schema.budgetPeriods.userId, user.id),
          eq(schema.budgetPeriods.id, id),
        ),
      )
      .returning(),
  ];

  if (reservationValues.length > 0) {
    queries.push(
      db
        .insert(schema.goalBudgetReservations)
        .values(reservationValues)
        .onConflictDoUpdate({
          target: [
            schema.goalBudgetReservations.budgetPeriodId,
            schema.goalBudgetReservations.goalId,
          ],
          set: {
            reservedAmountCents: sql`excluded.reserved_amount_cents`,
            recommendedAmountCents: sql`excluded.recommended_amount_cents`,
            feasibilityStatus: sql`excluded.feasibility_status`,
            feasibilityReason: sql`excluded.feasibility_reason`,
            updatedAt: sql`excluded.updated_at`,
          },
        }),
    );
  }

  if (allocRows.length > 0) {
    queries.push(
      db
        .insert(schema.weeklyBudgetAllocations)
        .values(allocRows)
        .onConflictDoNothing(),
    );
  }

  const results = await db.batch(queries as [D1Query, ...D1Query[]]);
  const [updated] = results[0] as BudgetPeriodRow[];

  return c.json(serializeBudget(updated));
});

budgetsRouter.post('/:id/lock', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const id = c.req.param('id');
  const now = nowISO();

  await getBudgetPeriodOrThrow(db, user.id, id);

  const [updated] = await db
    .update(schema.budgetPeriods)
    .set({ status: 'locked', lockedAt: now, updatedAt: now })
    .where(
      and(
        eq(schema.budgetPeriods.userId, user.id),
        eq(schema.budgetPeriods.id, id),
      ),
    )
    .returning();

  return c.json(serializeBudget(updated));
});

interface WeekChunk {
  start: Date;
  end: Date;
  days: number;
}

function chunkWeeks(startDateStr: string, endDateStr: string): WeekChunk[] {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const weeks: WeekChunk[] = [];
  const currentStart = new Date(start.getTime());

  while (currentStart <= end) {
    const currentEnd = new Date(
      currentStart.getTime() + 6 * 24 * 60 * 60 * 1000,
    );
    const finalEnd = currentEnd > end ? new Date(end.getTime()) : currentEnd;

    const days =
      Math.round(
        (finalEnd.getTime() - currentStart.getTime()) / (24 * 60 * 60 * 1000),
      ) + 1;
    weeks.push({
      start: new Date(currentStart.getTime()),
      end: new Date(finalEnd.getTime()),
      days,
    });

    currentStart.setDate(finalEnd.getDate() + 1);
    if (currentStart.getTime() <= finalEnd.getTime()) {
      currentStart.setTime(finalEnd.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  return weeks;
}

function weekStatus(
  startStr: string,
  endStr: string,
  todayStr: string,
): 'upcoming' | 'current' | 'completed' {
  if (todayStr >= startStr && todayStr <= endStr) return 'current';
  if (todayStr > endStr) return 'completed';
  return 'upcoming';
}

function buildWeeklyAllocationRows(
  userId: string,
  budgetPeriodId: string,
  startDateStr: string,
  endDateStr: string,
  totalAmount: number,
  strategy: 'equal_split' | 'calendar_aware' = 'equal_split',
  reservedCents = 0,
) {
  const reservedAmount = fromCents(reservedCents);
  const spendableAmount = Math.max(0, totalAmount - reservedAmount);

  const weeks = chunkWeeks(startDateStr, endDateStr);
  const totalWeeks = weeks.length;
  if (totalWeeks === 0) return [];

  const totalDays = weeks.reduce((sum, w) => sum + w.days, 0);
  const todayStr = new Date().toISOString().split('T')[0];
  let allocatedSum = 0;

  const rows = [];
  for (let i = 0; i < totalWeeks; i++) {
    const week = weeks[i];
    let plannedAmount =
      strategy === 'calendar_aware'
        ? Math.round(spendableAmount * (week.days / totalDays) * 100) / 100
        : Math.round((spendableAmount / totalWeeks) * 100) / 100;

    if (i === totalWeeks - 1) {
      plannedAmount = Math.round((spendableAmount - allocatedSum) * 100) / 100;
    } else {
      allocatedSum += plannedAmount;
    }

    const startStr = week.start.toISOString().split('T')[0];
    const endStr = week.end.toISOString().split('T')[0];
    const plannedCents = toCents(plannedAmount);

    rows.push({
      id: generateId(),
      budgetPeriodId,
      userId,
      weekIndex: i,
      weekStartDate: startStr,
      weekEndDate: endStr,
      allocationStrategy: strategy,
      plannedAmountCents: plannedCents,
      adjustmentAmountCents: 0,
      finalPlannedAmountCents: plannedCents,
      actualSpentAmountCentsCache: 0,
      remainingAmountCentsCache: plannedCents,
      status: weekStatus(startStr, endStr, todayStr),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    });
  }

  return rows;
}

function planGoalReservation(
  goal: InferSelectModel<typeof schema.savingsGoals>,
  availableBudget: number,
): { recommendedCents: number; status: string; reason: string | null } {
  const remaining = Math.max(
    0,
    fromCents(goal.targetAmountCents) - fromCents(goal.currentSavedAmountCents),
  );

  if (!goal.targetDate) {
    return {
      recommendedCents: toCents(remaining),
      status: 'on_track',
      reason: null,
    };
  }

  const today = new Date();
  const target = new Date(goal.targetDate);
  const msPerMonth = 1000 * 60 * 60 * 24 * 30.44;
  const monthsLeft = Math.max(
    1,
    Math.round((target.getTime() - today.getTime()) / msPerMonth),
  );
  const recommendedAmount = Math.round((remaining / monthsLeft) * 100) / 100;

  if (recommendedAmount > availableBudget * 0.5) {
    return {
      recommendedCents: toCents(recommendedAmount),
      status: 'unrealistic',
      reason: `Monthly contribution of ${recommendedAmount} exceeds 50% of available budget`,
    };
  }
  if (recommendedAmount > availableBudget * 0.25) {
    return {
      recommendedCents: toCents(recommendedAmount),
      status: 'at_risk',
      reason: `Monthly contribution of ${recommendedAmount} is above 25% of available budget`,
    };
  }
  return {
    recommendedCents: toCents(recommendedAmount),
    status: 'on_track',
    reason: null,
  };
}

async function buildGoalReservations(
  db: Db,
  userId: string,
  budgetPeriodId: string,
  availableBudget: number,
) {
  const goals = await db
    .select()
    .from(schema.savingsGoals)
    .where(
      and(
        eq(schema.savingsGoals.userId, userId),
        eq(schema.savingsGoals.status, 'active'),
        eq(schema.savingsGoals.reserveInBudget, true),
      ),
    )
    .orderBy(schema.savingsGoals.priorityRank);

  const values = [];
  let totalReservedCents = 0;

  for (const goal of goals) {
    const reservation = planGoalReservation(goal, availableBudget);
    totalReservedCents += reservation.recommendedCents;

    values.push({
      id: generateId(),
      budgetPeriodId,
      goalId: goal.id,
      reservedAmountCents: reservation.recommendedCents,
      recommendedAmountCents: reservation.recommendedCents,
      feasibilityStatus: reservation.status,
      feasibilityReason: reservation.reason,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    });
  }

  return { values, totalReservedCents };
}
