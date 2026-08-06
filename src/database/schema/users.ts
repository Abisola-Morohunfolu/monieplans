import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { user } from './auth';

export const userProfiles = sqliteTable('user_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  fullName: text('full_name'),
  preferredCurrency: text('preferred_currency').notNull().default('NGN'),
  timezone: text('timezone').notNull().default('Africa/Lagos'),
  budgetCycleAnchorDay: integer('budget_cycle_anchor_day').default(1),
  defaultBudgetCycleType: text('default_budget_cycle_type')
    .notNull()
    .default('calendar_month'),
  weekStartDay: text('week_start_day').notNull().default('monday'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
