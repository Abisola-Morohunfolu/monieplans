import { boolean, integer, numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { budgetPeriods } from './budget-periods';
import { categories } from './categories';

export const fixedExpenseCadenceEnum = pgEnum('fixed_expense_cadence', ['every_period']);

export const fixedExpenseInclusionEnum = pgEnum('fixed_expense_inclusion', [
  'included',
  'skipped',
  'removed',
]);

export const fixedExpenseOriginEnum = pgEnum('fixed_expense_origin', [
  'recurring_template',
  'one_off',
]);

export const fixedExpenseTemplates = pgTable('fixed_expense_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  categoryId: uuid('category_id').references(() => categories.id),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  cadence: fixedExpenseCadenceEnum('cadence').notNull().default('every_period'),
  defaultDueDay: integer('default_due_day'),
  isActive: boolean('is_active').notNull().default(true),
  isMandatory: boolean('is_mandatory').notNull().default(false),
  isProtectedFromCutRecommendations: boolean('is_protected_from_cut_recommendations')
    .notNull()
    .default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const fixedExpenseItems = pgTable('fixed_expense_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  budgetPeriodId: uuid('budget_period_id')
    .notNull()
    .references(() => budgetPeriods.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  fixedExpenseTemplateId: uuid('fixed_expense_template_id').references(
    () => fixedExpenseTemplates.id,
  ),
  name: text('name').notNull(),
  categoryId: uuid('category_id').references(() => categories.id),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  dueDate: text('due_date'),
  originType: fixedExpenseOriginEnum('origin_type').notNull().default('one_off'),
  inclusionStatus: fixedExpenseInclusionEnum('inclusion_status').notNull().default('included'),
  isMandatory: boolean('is_mandatory').notNull().default(false),
  isProtectedFromCutRecommendations: boolean('is_protected_from_cut_recommendations')
    .notNull()
    .default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
