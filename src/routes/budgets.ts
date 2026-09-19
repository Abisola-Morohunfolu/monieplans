import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import {
  generateId,
  nowISO,
  toCents,
  fromCents,
  monthRange,
} from '../shared/utils';
import {
  serializeBudget,
  serializeCategoryBudget,
  serializeCategory,
} from '../shared/serializers';
import { monthParamSchema, setAssignmentsSchema } from '../shared/schemas';
import type { SetAssignmentsInput } from '../shared/schemas';
import { validateJson } from '../shared/validate';
import { and, asc, eq, gte, isNull, lt, or, sql } from 'drizzle-orm';
import * as schema from '../database/schema';
import {
  getBudgetOrThrow,
  getPreferredCurrency,
  assertCategoryVisible,
  type Db,
} from './helpers';

export const budgetsRouter = new Hono();

function parseMonth(value: string | undefined): string {
  const parsed = monthParamSchema.safeParse(value);
  if (!parsed.success) {
    throw new HTTPException(400, {
      message: 'Month must be in YYYY-MM format',
    });
  }
  return parsed.data;
}

async function upsertBudget(db: Db, userId: string, month: string) {
  const currency = await getPreferredCurrency(db, userId);
  const now = nowISO();
  await db
    .insert(schema.budgets)
    .values({
      id: generateId(),
      userId,
      month,
      currency,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();
  const [budget] = await db
    .select()
    .from(schema.budgets)
    .where(
      and(eq(schema.budgets.userId, userId), eq(schema.budgets.month, month)),
    );
  return budget;
}

async function listAssignments(db: Db, budgetId: string) {
  return db
    .select()
    .from(schema.categoryBudgets)
    .where(eq(schema.categoryBudgets.budgetId, budgetId))
    .orderBy(asc(schema.categoryBudgets.categoryId));
}

budgetsRouter.get('/:month', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const month = parseMonth(c.req.param('month'));

  const budget = await getBudgetOrThrow(db, user.id, month);
  const assignments = await listAssignments(db, budget.id);

  return c.json({
    ...serializeBudget(budget),
    assignments: assignments.map(serializeCategoryBudget),
  });
});

budgetsRouter.put('/:month', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const month = parseMonth(c.req.param('month'));

  const budget = await upsertBudget(db, user.id, month);
  const assignments = await listAssignments(db, budget.id);

  return c.json({
    ...serializeBudget(budget),
    assignments: assignments.map(serializeCategoryBudget),
  });
});

budgetsRouter.put(
  '/:month/assignments',
  validateJson(setAssignmentsSchema),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const month = parseMonth(c.req.param('month'));
    const body = c.get('body') as unknown as SetAssignmentsInput;

    const budget = await upsertBudget(db, user.id, month);

    for (const assignment of body.assignments) {
      await assertCategoryVisible(db, user.id, assignment.categoryId);
    }

    const now = nowISO();
    const rows = body.assignments.map((assignment) => ({
      id: generateId(),
      budgetId: budget.id,
      categoryId: assignment.categoryId,
      assignedCents: toCents(assignment.assigned),
      createdAt: now,
      updatedAt: now,
    }));

    if (rows.length > 0) {
      await db
        .insert(schema.categoryBudgets)
        .values(rows)
        .onConflictDoUpdate({
          target: [
            schema.categoryBudgets.budgetId,
            schema.categoryBudgets.categoryId,
          ],
          set: {
            assignedCents: sql`excluded.assigned_cents`,
            updatedAt: now,
          },
        });
    }

    const assignments = await listAssignments(db, budget.id);
    return c.json(assignments.map(serializeCategoryBudget));
  },
);

budgetsRouter.get('/:month/summary', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const month = parseMonth(c.req.param('month'));

  const budget = await getBudgetOrThrow(db, user.id, month);
  const { start, nextStart } = monthRange(month);

  const categories = await db
    .select()
    .from(schema.categories)
    .where(
      and(
        eq(schema.categories.kind, 'expense'),
        or(
          isNull(schema.categories.userId),
          eq(schema.categories.userId, user.id),
        ),
      ),
    )
    .orderBy(
      sql`coalesce(${schema.categories.groupName}, '')`,
      asc(schema.categories.name),
    );

  const assignments = await db
    .select()
    .from(schema.categoryBudgets)
    .where(eq(schema.categoryBudgets.budgetId, budget.id));

  const assignedMap = new Map<string, number>(
    assignments.map((a) => [a.categoryId, a.assignedCents]),
  );

  const activityRows = await db
    .select({
      categoryId: schema.transactions.categoryId,
      total: sql<number>`coalesce(sum(${schema.transactions.amountCents}), 0)`,
    })
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.userId, user.id),
        eq(schema.transactions.type, 'expense'),
        gte(schema.transactions.occurredOn, start),
        lt(schema.transactions.occurredOn, nextStart),
        isNull(schema.transactions.deletedAt),
      ),
    )
    .groupBy(schema.transactions.categoryId);

  const activityMap = new Map<string, number>(
    activityRows.map((r) => [r.categoryId ?? '__none__', Number(r.total)]),
  );

  const totalAssigned = assignments.reduce(
    (sum, a) => sum + a.assignedCents,
    0,
  );

  const [incomeRow] = await db
    .select({
      total: sql<number>`coalesce(sum(${schema.transactions.amountCents}), 0)`,
    })
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.userId, user.id),
        eq(schema.transactions.type, 'income'),
        gte(schema.transactions.occurredOn, start),
        lt(schema.transactions.occurredOn, nextStart),
        isNull(schema.transactions.deletedAt),
      ),
    );
  const [expenseRow] = await db
    .select({
      total: sql<number>`coalesce(sum(${schema.transactions.amountCents}), 0)`,
    })
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.userId, user.id),
        eq(schema.transactions.type, 'expense'),
        gte(schema.transactions.occurredOn, start),
        lt(schema.transactions.occurredOn, nextStart),
        isNull(schema.transactions.deletedAt),
      ),
    );

  const totalIncome = Number(incomeRow?.total ?? 0);
  const totalExpense = Number(expenseRow?.total ?? 0);

  const categorySummaries = categories.map((category) => {
    const assigned = assignedMap.get(category.id) ?? 0;
    const activity = activityMap.get(category.id) ?? 0;
    return {
      ...serializeCategory(category),
      assigned: fromCents(assigned),
      activity: fromCents(activity),
      available: fromCents(assigned - activity),
    };
  });

  return c.json({
    ...serializeBudget(budget),
    categories: categorySummaries,
    totals: {
      totalAssigned: fromCents(totalAssigned),
      totalIncome: fromCents(totalIncome),
      totalExpense: fromCents(totalExpense),
      unassigned: fromCents(totalIncome - totalAssigned),
    },
  });
});
