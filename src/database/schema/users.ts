import { integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth';

export const budgetCycleTypeEnum = pgEnum('budget_cycle_type', [
  'calendar_month',
  'custom_30_day',
  'custom_31_day',
]);

export const weekStartDayEnum = pgEnum('week_start_day', [
  'monday',
  'sunday',
  'saturday',
]);

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  fullName: text('full_name'),
  preferredCurrency: text('preferred_currency').notNull().default('NGN'),
  timezone: text('timezone').notNull().default('Africa/Lagos'),
  budgetCycleAnchorDay: integer('budget_cycle_anchor_day').default(1),
  defaultBudgetCycleType: budgetCycleTypeEnum('default_budget_cycle_type')
    .notNull()
    .default('calendar_month'),
  weekStartDay: weekStartDayEnum('week_start_day').notNull().default('monday'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
