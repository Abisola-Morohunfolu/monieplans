import { date, numeric, pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth';

export const budgetPeriodStatusEnum = pgEnum('budget_period_status', [
  'draft',
  'active',
  'locked',
  'archived',
]);

export const planningModeEnum = pgEnum('planning_mode', [
  'income_based',
  'spending_cap_based',
]);

export const budgetPeriods = pgTable(
  'budget_periods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    periodStartDate: date('period_start_date').notNull(),
    periodEndDate: date('period_end_date').notNull(),
    cycleType: text('cycle_type').notNull().default('calendar_month'),
    presetMonth: text('preset_month'),
    planningMode: planningModeEnum('planning_mode').notNull().default('income_based'),
    monthlyIncomeAmount: numeric('monthly_income_amount', { precision: 15, scale: 2 }),
    monthlyBudgetCapAmount: numeric('monthly_budget_cap_amount', { precision: 15, scale: 2 }),
    currency: text('currency').notNull().default('NGN'),
    notes: text('notes'),
    status: budgetPeriodStatusEnum('status').notNull().default('draft'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    lockedAt: timestamp('locked_at'),
  },
  (t) => [unique().on(t.userId, t.periodStartDate)],
);
