import { boolean, integer, numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { budgetPeriods } from './budget-periods';

export const goalStatusEnum = pgEnum('goal_status', ['active', 'paused', 'completed', 'archived']);

export const goalFeasibilityEnum = pgEnum('goal_feasibility', [
  'on_track',
  'at_risk',
  'unrealistic',
]);

export const savingsGoals = pgTable('savings_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  targetAmount: numeric('target_amount', { precision: 15, scale: 2 }).notNull(),
  currentSavedAmount: numeric('current_saved_amount', { precision: 15, scale: 2 })
    .notNull()
    .default('0'),
  targetDate: text('target_date'),
  priorityRank: integer('priority_rank').notNull().default(0),
  status: goalStatusEnum('status').notNull().default('active'),
  reserveInBudget: boolean('reserve_in_budget').notNull().default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const goalBudgetReservations = pgTable('goal_budget_reservations', {
  id: uuid('id').primaryKey().defaultRandom(),
  budgetPeriodId: uuid('budget_period_id')
    .notNull()
    .references(() => budgetPeriods.id, { onDelete: 'cascade' }),
  goalId: uuid('goal_id')
    .notNull()
    .references(() => savingsGoals.id, { onDelete: 'cascade' }),
  reservedAmount: numeric('reserved_amount', { precision: 15, scale: 2 }).notNull(),
  recommendedAmount: numeric('recommended_amount', { precision: 15, scale: 2 }),
  feasibilityStatus: goalFeasibilityEnum('feasibility_status').notNull().default('on_track'),
  feasibilityReason: text('feasibility_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
