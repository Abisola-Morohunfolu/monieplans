import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { user } from './auth';
import { budgetPeriods } from './budget-periods';

export const savingsGoals = sqliteTable('savings_goals', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  targetAmountCents: integer('target_amount_cents').notNull(),
  currentSavedAmountCents: integer('current_saved_amount_cents').notNull().default(0),
  targetDate: text('target_date'),
  priorityRank: integer('priority_rank').notNull().default(0),
  status: text('status').notNull().default('active'),
  reserveInBudget: integer('reserve_in_budget', { mode: 'boolean' }).notNull().default(false),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const goalBudgetReservations = sqliteTable(
  'goal_budget_reservations',
  {
    id: text('id').primaryKey(),
    budgetPeriodId: text('budget_period_id')
      .notNull()
      .references(() => budgetPeriods.id, { onDelete: 'cascade' }),
    goalId: text('goal_id')
      .notNull()
      .references(() => savingsGoals.id, { onDelete: 'cascade' }),
    reservedAmountCents: integer('reserved_amount_cents').notNull(),
    recommendedAmountCents: integer('recommended_amount_cents'),
    feasibilityStatus: text('feasibility_status').notNull().default('on_track'),
    feasibilityReason: text('feasibility_reason'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [unique('uq_goal_reservations_period_goal').on(t.budgetPeriodId, t.goalId)],
);
