import { HTTPException } from 'hono/http-exception';
import {
  BUFFER,
  localDate,
  summarizePlan,
  type Allocation,
  type Adjustment,
  type Bucket,
  type Expense,
} from './planning';
import { monthRange } from '../shared/utils';
export interface BudgetRow {
  id: string;
  month: string;
  currency: string;
  status: string;
  spending_limit_cents: number | null;
  created_at: string;
  updated_at: string;
}
export const statement = (
  db: D1Database,
  sql: string,
  ...args: (string | number | null)[]
) => db.prepare(sql).bind(...args);
export async function revision(db: D1Database, userId: string) {
  return (
    (
      await statement(
        db,
        'SELECT revision FROM ledger_versions WHERE user_id=?',
        userId,
      ).first<{ revision: number }>()
    )?.revision ?? 0
  );
}
export async function atomic(
  db: D1Database,
  userId: string,
  expected: number,
  statements: D1PreparedStatement[],
) {
  const id = crypto.randomUUID();
  try {
    return await db.batch([
      statement(
        db,
        'INSERT INTO mutation_guards(id,valid) VALUES(?,CASE WHEN COALESCE((SELECT revision FROM ledger_versions WHERE user_id=?),0)=? THEN 1 ELSE 0 END)',
        id,
        userId,
        expected,
      ),
      ...statements,
      statement(db, 'DELETE FROM mutation_guards WHERE id=?', id),
    ]);
  } catch (error) {
    if (String(error).includes('CHECK constraint failed'))
      throw new HTTPException(409, {
        message: 'Your spending or plan changed. Refresh and try again.',
      });
    throw error;
  }
}
export async function loadPlan(db: D1Database, userId: string, month: string) {
  const { start, nextStart } = monthRange(month);
  const results = await db.batch<Record<string, unknown>>([
    statement(
      db,
      'SELECT * FROM budgets WHERE user_id=? AND month=?',
      userId,
      month,
    ),
    statement(
      db,
      `SELECT c.id,c.name,c.code,c.group_name,c.kind,c.is_system,COALESCE(cb.assigned_cents,0) assignedCents,COALESCE(cb.original_target_cents,0) originalTargetCents,COALESCE(cb.pacing,'monthly') pacing FROM categories c LEFT JOIN category_budgets cb ON cb.category_id=c.id AND cb.budget_id=(SELECT id FROM budgets WHERE user_id=? AND month=?) WHERE c.kind='expense' AND (c.user_id IS NULL OR c.user_id=?) ORDER BY c.name`,
      userId,
      month,
      userId,
    ),
    statement(
      db,
      `SELECT COALESCE(s.category_id,t.category_id) categoryId,COALESCE(s.amount_cents,t.amount_cents) amountCents,t.occurred_on occurredOn FROM transactions t LEFT JOIN transaction_splits s ON s.transaction_id=t.id WHERE t.user_id=? AND t.type='expense' AND t.payment_status='completed' AND t.deleted_at IS NULL AND t.occurred_on>=? AND t.occurred_on<? AND t.currency=(SELECT currency FROM budgets WHERE user_id=? AND month=?)`,
      userId,
      start,
      nextStart,
      userId,
      month,
    ),
    statement(
      db,
      'SELECT bucket_id bucketId,week_start weekStart,amount_cents amountCents FROM weekly_allocations WHERE budget_id=(SELECT id FROM budgets WHERE user_id=? AND month=?)',
      userId,
      month,
    ),
    statement(
      db,
      'SELECT bucket_id bucketId,week_start weekStart,amount_cents amountCents,movement_id movementId FROM weekly_adjustments WHERE budget_id=(SELECT id FROM budgets WHERE user_id=? AND month=?)',
      userId,
      month,
    ),
    statement(
      db,
      'SELECT * FROM budget_movements WHERE budget_id=(SELECT id FROM budgets WHERE user_id=? AND month=?) ORDER BY created_at DESC',
      userId,
      month,
    ),
    statement(
      db,
      'SELECT revision FROM ledger_versions WHERE user_id=?',
      userId,
    ),
    statement(
      db,
      `SELECT COALESCE(SUM(amount_cents),0) total FROM transactions WHERE user_id=? AND type='income' AND payment_status='completed' AND deleted_at IS NULL AND occurred_on>=? AND occurred_on<? AND currency=(SELECT currency FROM budgets WHERE user_id=? AND month=?)`,
      userId,
      start,
      nextStart,
      userId,
      month,
    ),
    statement(db, 'SELECT timezone FROM user_profiles WHERE user_id=?', userId),
    statement(
      db,
      "SELECT count(*) total FROM transactions WHERE user_id=? AND type='expense' AND payment_status='completed' AND deleted_at IS NULL AND occurred_on>=? AND occurred_on<? AND currency!=(SELECT currency FROM budgets WHERE user_id=? AND month=?)",
      userId,
      start,
      nextStart,
      userId,
      month,
    ),
  ]);
  const budget = results[0].results[0] as unknown as BudgetRow | undefined;
  if (!budget) throw new HTTPException(404, { message: 'Budget not found' });
  const buckets = results[1].results as unknown as (Bucket & {
    code: string;
    group_name: string | null;
    is_system: number;
  })[];
  const expenses = results[2].results as unknown as Expense[];
  const allocations = results[3].results as unknown as Allocation[];
  const adjustments = results[4].results as unknown as Adjustment[];
  const today = localDate(
    (results[8].results[0]?.timezone as string) || 'Africa/Lagos',
  );
  const summary = summarizePlan(
    month,
    budget.spending_limit_cents,
    buckets,
    expenses,
    allocations,
    adjustments,
    today,
  );
  return {
    budget,
    buckets,
    expenses,
    allocations,
    adjustments,
    summary,
    today,
    movements: results[5].results,
    revision: Number(results[6].results[0]?.revision ?? 0),
    incomeCents: Number(results[7].results[0]?.total ?? 0),
    excludedCurrencyCount: Number(results[9].results[0]?.total ?? 0),
  };
}
export function serializePlan(plan: Awaited<ReturnType<typeof loadPlan>>) {
  const { budget, summary } = plan;
  return {
    id: budget.id,
    month: budget.month,
    currency: budget.currency,
    status: budget.status,
    createdAt: budget.created_at,
    updatedAt: budget.updated_at,
    spendingLimit:
      budget.spending_limit_cents === null
        ? null
        : budget.spending_limit_cents / 100,
    revision: plan.revision,
    excludedCurrencyCount: plan.excludedCurrencyCount,
    categories: summary.categories.map((b) => ({
      ...b,
      assigned: b.assignedCents / 100,
      originalTarget: b.originalTargetCents / 100,
      activity: b.spentCents / 100,
      available: b.availableCents / 100,
      groupName: plan.buckets.find((c) => c.id === b.id)?.group_name,
      kind: 'expense',
      isSystem: !!plan.buckets.find((c) => c.id === b.id)?.is_system,
    })),
    weeks: summary.weeks,
    currentWeek: summary.currentWeek,
    weeklyAvailable:
      summary.weeklyAvailableCents === null
        ? null
        : summary.weeklyAvailableCents / 100,
    buffer: {
      id: BUFFER,
      assigned: summary.bufferCents / 100,
      available: summary.bufferAvailableCents / 100,
    },
    movements: plan.movements,
    totals: {
      totalAssigned: summary.totalAssignedCents / 100,
      totalIncome: plan.incomeCents / 100,
      totalExpense: summary.totalExpenseCents / 100,
      unassigned: summary.bufferCents / 100,
      remaining: summary.monthlyRemainingCents / 100,
      flexibleRemaining: summary.flexibleRemainingCents / 100,
    },
  };
}
