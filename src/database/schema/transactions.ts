import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { user } from './auth';
import { categories } from './categories';

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency').notNull().default('NGN'),
    occurredOn: text('occurred_on').notNull(),
    categoryId: text('category_id').references(() => categories.id),
    payee: text('payee'),
    note: text('note'),
    source: text('source').notNull().default('manual'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text('deleted_at'),
  },
  (t) => [index('transactions_user_occurred_idx').on(t.userId, t.occurredOn)],
);
