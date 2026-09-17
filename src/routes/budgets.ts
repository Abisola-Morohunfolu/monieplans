import { Hono } from 'hono';
import { generateId, nowISO, toCents, fromCents } from '../shared/utils';
import {
  serializeBudget,
  serializeAllocation,
  serializeFixedExpenseItem,
} from '../shared/serializers';
import { createBudgetSchema, paginationQuerySchema } from '../shared/schemas';
import { validateJson, validateQuery } from '../shared/validate';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import * as schema from '../database/schema';
import {
  getBudgetPeriodOrThrow,
  generateFixedExpenseItemsForPeriod,
  sumFixedExpenseItemsCents,
  type D1Query,
  type Db,
} from './helpers';
import { paginated, resolveLimitOffset } from '../shared/pagination';

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

  const [period] = await db
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
    .returning();

  if (body.activateImmediately) {
    const totalCents =
      body.monthlyBudgetCapAmount != null
        ? toCents(body.monthlyBudgetCapAmount)
        : body.monthlyIncomeAmount != null
          ? toCents(body.monthlyIncomeAmount)
          : 0;
    const totalAmount = fromCents(totalCents);

    await activateBudgetPeriod(
      db,
      user.id,
      {
        id: periodId,
        periodStartDate: body.periodStartDate,
        periodEndDate: body.periodEndDate,
      },
      totalAmount,
    );
  }

  return c.json(serializeBudget(period), 201);
});

budgetsRouter.get('/', validateQuery(paginationQuerySchema), async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const query = c.get('query') as unknown as ReturnType<
    typeof paginationQuerySchema.parse
  >;
  const { limit, offset } = resolveLimitOffset(query);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.budgetPeriods)
    .where(eq(schema.budgetPeriods.userId, user.id));
  const total = Number(countRow?.count ?? 0);

  const periods = await db
    .select()
    .from(schema.budgetPeriods)
    .where(eq(schema.budgetPeriods.userId, user.id))
    .orderBy(desc(schema.budgetPeriods.periodStartDate))
    .limit(limit)
    .offset(offset);

  return c.json(paginated(periods.map(serializeBudget), total, limit, offset));
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

budgetsRouter.get('/:id/allocations', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const id = c.req.param('id');

  await getBudgetPeriodOrThrow(db, user.id, id);

  const allocations = await db
    .select()
    .from(schema.weeklyBudgetAllocations)
    .where(eq(schema.weeklyBudgetAllocations.budgetPeriodId, id))
    .orderBy(asc(schema.weeklyBudgetAllocations.weekIndex));

  return c.json(allocations.map(serializeAllocation));
});

budgetsRouter.get('/:id/summary', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const id = c.req.param('id');

  const period = await getBudgetPeriodOrThrow(db, user.id, id);

  const capCents =
    period.monthlyBudgetCapAmountCents ?? period.monthlyIncomeAmountCents ?? 0;

  const [expenseRow] = await db
    .select({
      spent: sql<number>`coalesce(sum(${schema.expenseEntries.amountCents}), 0)`,
    })
    .from(schema.expenseEntries)
    .where(
      and(
        eq(schema.expenseEntries.userId, user.id),
        eq(schema.expenseEntries.budgetPeriodId, id),
        isNull(schema.expenseEntries.deletedAt),
      ),
    );
  const spentCents = Number(expenseRow?.spent ?? 0);

  const fixedExpenseItems = await db
    .select({
      id: schema.fixedExpenseItems.id,
      budgetPeriodId: schema.fixedExpenseItems.budgetPeriodId,
      fixedExpenseTemplateId: schema.fixedExpenseItems.fixedExpenseTemplateId,
      name: schema.fixedExpenseItems.name,
      categoryId: schema.fixedExpenseItems.categoryId,
      categoryName: schema.categories.name,
      amountCents: schema.fixedExpenseItems.amountCents,
      dueDate: schema.fixedExpenseItems.dueDate,
      originType: schema.fixedExpenseItems.originType,
      inclusionStatus: schema.fixedExpenseItems.inclusionStatus,
      isMandatory: schema.fixedExpenseItems.isMandatory,
      isProtectedFromCutRecommendations:
        schema.fixedExpenseItems.isProtectedFromCutRecommendations,
      notes: schema.fixedExpenseItems.notes,
      createdAt: schema.fixedExpenseItems.createdAt,
      updatedAt: schema.fixedExpenseItems.updatedAt,
    })
    .from(schema.fixedExpenseItems)
    .leftJoin(
      schema.categories,
      eq(schema.fixedExpenseItems.categoryId, schema.categories.id),
    )
    .where(
      and(
        eq(schema.fixedExpenseItems.userId, user.id),
        eq(schema.fixedExpenseItems.budgetPeriodId, id),
        eq(schema.fixedExpenseItems.inclusionStatus, 'included'),
      ),
    )
    .orderBy(asc(schema.fixedExpenseItems.dueDate));

  const fixedExpensesTotalCents = fixedExpenseItems.reduce(
    (sum, i) => sum + i.amountCents,
    0,
  );

  const [incomeRow] = await db
    .select({
      income: sql<number>`coalesce(sum(${schema.incomeEntries.amountCents}), 0)`,
    })
    .from(schema.incomeEntries)
    .where(
      and(
        eq(schema.incomeEntries.userId, user.id),
        eq(schema.incomeEntries.budgetPeriodId, id),
        isNull(schema.incomeEntries.deletedAt),
      ),
    );
  const incomeCents = Number(incomeRow?.income ?? 0);

  const totalSpentCents = spentCents + fixedExpensesTotalCents;

  const categoryTotals = await db
    .select({
      categoryId: schema.categories.id,
      categoryName: schema.categories.name,
      categoryCode: schema.categories.code,
      totalCents: sql<number>`coalesce(sum(${schema.expenseEntries.amountCents}), 0)`,
    })
    .from(schema.expenseEntries)
    .leftJoin(
      schema.categories,
      eq(schema.expenseEntries.categoryId, schema.categories.id),
    )
    .where(
      and(
        eq(schema.expenseEntries.userId, user.id),
        eq(schema.expenseEntries.budgetPeriodId, id),
        isNull(schema.expenseEntries.deletedAt),
      ),
    )
    .groupBy(
      schema.categories.id,
      schema.categories.name,
      schema.categories.code,
    )
    .orderBy(sql`sum(${schema.expenseEntries.amountCents}) desc`);

  const fixedCategoryTotals = await db
    .select({
      categoryId: schema.categories.id,
      categoryName: schema.categories.name,
      categoryCode: schema.categories.code,
      totalCents: sql<number>`coalesce(sum(${schema.fixedExpenseItems.amountCents}), 0)`,
    })
    .from(schema.fixedExpenseItems)
    .leftJoin(
      schema.categories,
      eq(schema.fixedExpenseItems.categoryId, schema.categories.id),
    )
    .where(
      and(
        eq(schema.fixedExpenseItems.userId, user.id),
        eq(schema.fixedExpenseItems.budgetPeriodId, id),
        eq(schema.fixedExpenseItems.inclusionStatus, 'included'),
      ),
    )
    .groupBy(
      schema.categories.id,
      schema.categories.name,
      schema.categories.code,
    );

  const categoryTotalsMap = new Map<
    string,
    {
      categoryId: string | null;
      categoryName: string | null;
      categoryCode: string | null;
      totalCents: number;
    }
  >();

  for (const t of categoryTotals) {
    categoryTotalsMap.set(t.categoryId ?? '__none__', {
      categoryId: t.categoryId,
      categoryName: t.categoryName,
      categoryCode: t.categoryCode,
      totalCents: Number(t.totalCents),
    });
  }
  for (const f of fixedCategoryTotals) {
    const key = f.categoryId ?? '__none__';
    const existing = categoryTotalsMap.get(key);
    if (existing) {
      existing.totalCents += Number(f.totalCents);
    } else {
      categoryTotalsMap.set(key, {
        categoryId: f.categoryId,
        categoryName: f.categoryName,
        categoryCode: f.categoryCode,
        totalCents: Number(f.totalCents),
      });
    }
  }

  const mergedCategoryTotals = [...categoryTotalsMap.values()].sort(
    (a, b) => b.totalCents - a.totalCents,
  );

  const allocations = await db
    .select()
    .from(schema.weeklyBudgetAllocations)
    .where(eq(schema.weeklyBudgetAllocations.budgetPeriodId, id))
    .orderBy(asc(schema.weeklyBudgetAllocations.weekIndex));

  return c.json({
    ...serializeBudget(period),
    cap: fromCents(capCents),
    incomeTotal: fromCents(incomeCents),
    spent: fromCents(totalSpentCents),
    remaining: fromCents(capCents - totalSpentCents),
    fixedExpensesTotal: fromCents(fixedExpensesTotalCents),
    categoryTotals: mergedCategoryTotals.map((t) => ({
      categoryId: t.categoryId,
      categoryName: t.categoryName,
      categoryCode: t.categoryCode,
      amount: fromCents(t.totalCents),
    })),
    fixedExpenseItems: fixedExpenseItems.map(serializeFixedExpenseItem),
    weeklyAllocations: allocations.map(serializeAllocation),
  });
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

  const [updated] = await db
    .update(schema.budgetPeriods)
    .set({ status: 'active', updatedAt: now })
    .where(
      and(
        eq(schema.budgetPeriods.userId, user.id),
        eq(schema.budgetPeriods.id, id),
      ),
    )
    .returning();

  await activateBudgetPeriod(db, user.id, period, totalAmount);

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
  fixedExpenseCents = 0,
) {
  const committedAmount =
    fromCents(reservedCents) + fromCents(fixedExpenseCents);
  const spendableAmount = Math.max(0, totalAmount - committedAmount);

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

async function activateBudgetPeriod(
  db: Db,
  userId: string,
  period: { id: string; periodStartDate: string; periodEndDate: string },
  totalAmount: number,
): Promise<void> {
  await generateFixedExpenseItemsForPeriod(db, userId, period);
  const fixedExpenseCents = await sumFixedExpenseItemsCents(db, period.id);

  const { values: reservationValues, totalReservedCents } =
    await buildGoalReservations(db, userId, period.id, totalAmount);

  const allocRows = buildWeeklyAllocationRows(
    userId,
    period.id,
    period.periodStartDate,
    period.periodEndDate,
    totalAmount,
    'equal_split',
    totalReservedCents,
    fixedExpenseCents,
  );

  const queries: D1Query[] = [];

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

  if (queries.length > 0) {
    await db.batch(queries as [D1Query, ...D1Query[]]);
  }
}
