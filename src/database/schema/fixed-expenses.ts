import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { user } from './auth';
import { budgetPeriods } from './budget-periods';
import { categories } from './categories';

export const fixedExpenseTemplates = sqliteTable('fixed_expense_templates', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  categoryId: text('category_id').references(() => categories.id),
  amountCents: integer('amount_cents').notNull(),
  cadence: text('cadence').notNull().default('every_period'),
  defaultDueDay: integer('default_due_day'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  isMandatory: integer('is_mandatory', { mode: 'boolean' })
    .notNull()
    .default(false),
  isProtectedFromCutRecommendations: integer(
    'is_protected_from_cut_recommendations',
    { mode: 'boolean' },
  )
    .notNull()
    .default(false),
  notes: text('notes'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const fixedExpenseItems = sqliteTable('fixed_expense_items', {
  id: text('id').primaryKey(),
  budgetPeriodId: text('budget_period_id')
    .notNull()
    .references(() => budgetPeriods.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  fixedExpenseTemplateId: text('fixed_expense_template_id').references(
    () => fixedExpenseTemplates.id,
  ),
  name: text('name').notNull(),
  categoryId: text('category_id').references(() => categories.id),
  amountCents: integer('amount_cents').notNull(),
  dueDate: text('due_date'),
  originType: text('origin_type').notNull().default('one_off'),
  inclusionStatus: text('inclusion_status').notNull().default('included'),
  isMandatory: integer('is_mandatory', { mode: 'boolean' })
    .notNull()
    .default(false),
  isProtectedFromCutRecommendations: integer(
    'is_protected_from_cut_recommendations',
    { mode: 'boolean' },
  )
    .notNull()
    .default(false),
  notes: text('notes'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
