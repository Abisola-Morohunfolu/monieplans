import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { user } from './auth';

export const budgetPeriods = sqliteTable(
  'budget_periods',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    periodStartDate: text('period_start_date').notNull(),
    periodEndDate: text('period_end_date').notNull(),
    cycleType: text('cycle_type').notNull().default('calendar_month'),
    presetMonth: text('preset_month'),
    planningMode: text('planning_mode').notNull().default('income_based'),
    monthlyIncomeAmountCents: integer('monthly_income_amount_cents'),
    monthlyBudgetCapAmountCents: integer('monthly_budget_cap_amount_cents'),
    currency: text('currency').notNull().default('NGN'),
    notes: text('notes'),
    status: text('status').notNull().default('draft'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    lockedAt: text('locked_at'),
  },
  (t) => [unique('uq_budget_periods_user_date').on(t.userId, t.periodStartDate)],
);
