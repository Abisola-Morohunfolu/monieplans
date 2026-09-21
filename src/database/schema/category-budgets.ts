import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { budgets } from './budgets';
import { categories } from './categories';

export const categoryBudgets = sqliteTable(
  'category_budgets',
  {
    id: text('id').primaryKey(),
    budgetId: text('budget_id')
      .notNull()
      .references(() => budgets.id, { onDelete: 'cascade' }),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id),
    assignedCents: integer('assigned_cents').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    unique('uq_category_budgets_budget_category').on(t.budgetId, t.categoryId),
  ],
);
