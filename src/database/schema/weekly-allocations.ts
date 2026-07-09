import { date, integer, numeric, pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { budgetPeriods } from './budget-periods';

export const allocationStrategyEnum = pgEnum('allocation_strategy', [
  'equal_split',
  'calendar_aware',
]);

export const weekStatusEnum = pgEnum('week_status', ['upcoming', 'current', 'completed']);

export const weeklyBudgetAllocations = pgTable(
  'weekly_budget_allocations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    budgetPeriodId: uuid('budget_period_id')
      .notNull()
      .references(() => budgetPeriods.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    weekIndex: integer('week_index').notNull(),
    weekStartDate: date('week_start_date').notNull(),
    weekEndDate: date('week_end_date').notNull(),
    allocationStrategy: allocationStrategyEnum('allocation_strategy')
      .notNull()
      .default('equal_split'),
    plannedAmount: numeric('planned_amount', { precision: 15, scale: 2 }).notNull(),
    adjustmentAmount: numeric('adjustment_amount', { precision: 15, scale: 2 })
      .notNull()
      .default('0'),
    finalPlannedAmount: numeric('final_planned_amount', { precision: 15, scale: 2 }).notNull(),
    actualSpentAmountCache: numeric('actual_spent_amount_cache', { precision: 15, scale: 2 }),
    remainingAmountCache: numeric('remaining_amount_cache', { precision: 15, scale: 2 }),
    status: weekStatusEnum('status').notNull().default('upcoming'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [unique().on(t.budgetPeriodId, t.weekIndex)],
);
