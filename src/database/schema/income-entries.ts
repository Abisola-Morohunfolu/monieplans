import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { user } from './auth';
import { budgetPeriods } from './budget-periods';
import { categories } from './categories';
import { transactions } from './statements';

export const incomeEntries = sqliteTable('income_entries', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  budgetPeriodId: text('budget_period_id')
    .notNull()
    .references(() => budgetPeriods.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').references(() => categories.id),
  transactionId: text('transaction_id').references(() => transactions.id),
  amountCents: integer('amount_cents').notNull(),
  incomeDate: text('income_date').notNull(),
  description: text('description'),
  sourceType: text('source_type').notNull().default('manual'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text('deleted_at'),
});
