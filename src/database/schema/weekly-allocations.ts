import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { user } from './auth';
import { budgetPeriods } from './budget-periods';

export const weeklyBudgetAllocations = sqliteTable(
  'weekly_budget_allocations',
  {
    id: text('id').primaryKey(),
    budgetPeriodId: text('budget_period_id')
      .notNull()
      .references(() => budgetPeriods.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    weekIndex: integer('week_index').notNull(),
    weekStartDate: text('week_start_date').notNull(),
    weekEndDate: text('week_end_date').notNull(),
    allocationStrategy: text('allocation_strategy').notNull().default('equal_split'),
    plannedAmountCents: integer('planned_amount_cents').notNull(),
    adjustmentAmountCents: integer('adjustment_amount_cents').notNull().default(0),
    finalPlannedAmountCents: integer('final_planned_amount_cents').notNull(),
    actualSpentAmountCentsCache: integer('actual_spent_amount_cents_cache'),
    remainingAmountCentsCache: integer('remaining_amount_cents_cache'),
    status: text('status').notNull().default('upcoming'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [unique('uq_weekly_alloc_period_week').on(t.budgetPeriodId, t.weekIndex)],
);
