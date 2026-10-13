import {
  sqliteTable,
  text,
  integer,
  unique,
  index,
  check,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { user } from './auth';
import { budgets } from './budgets';
import { categories } from './categories';
import { transactions } from './transactions';
export const ledgerVersions = sqliteTable('ledger_versions', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  revision: integer('revision').notNull().default(0),
});
export const mutationGuards = sqliteTable(
  'mutation_guards',
  { id: text('id').primaryKey(), valid: integer('valid').notNull() },
  (t) => [check('guard_valid', sql`${t.valid}=1`)],
);
export const weeklyAllocations = sqliteTable(
  'weekly_allocations',
  {
    id: text('id').primaryKey(),
    budgetId: text('budget_id')
      .notNull()
      .references(() => budgets.id, { onDelete: 'cascade' }),
    bucketId: text('bucket_id').notNull(),
    weekStart: text('week_start').notNull(),
    amountCents: integer('amount_cents').notNull(),
  },
  (t) => [
    unique().on(t.budgetId, t.bucketId, t.weekStart),
    check('weekly_nonnegative', sql`${t.amountCents}>=0`),
  ],
);
export const weeklyAdjustments = sqliteTable('weekly_adjustments', {
  id: text('id').primaryKey(),
  budgetId: text('budget_id')
    .notNull()
    .references(() => budgets.id, { onDelete: 'cascade' }),
  bucketId: text('bucket_id').notNull(),
  weekStart: text('week_start').notNull(),
  amountCents: integer('amount_cents').notNull(),
  movementId: text('movement_id').notNull(),
});
export const budgetMovements = sqliteTable(
  'budget_movements',
  {
    id: text('id').primaryKey(),
    budgetId: text('budget_id')
      .notNull()
      .references(() => budgets.id, { onDelete: 'cascade' }),
    sourceId: text('source_id').notNull(),
    destinationId: text('destination_id').notNull(),
    amountCents: integer('amount_cents').notNull(),
    occurredOn: text('occurred_on').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    unique().on(t.budgetId, t.id),
    check('move_positive', sql`${t.amountCents}>0`),
  ],
);
export const transactionSplits = sqliteTable(
  'transaction_splits',
  {
    id: text('id').primaryKey(),
    transactionId: text('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    categoryId: text('category_id').references(() => categories.id),
    amountCents: integer('amount_cents').notNull(),
  },
  (t) => [
    index('splits_transaction_idx').on(t.transactionId),
    check('split_positive', sql`${t.amountCents}>0`),
  ],
);
export const captures = sqliteTable(
  'captures',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    objectKey: text('object_key').notNull(),
    sha256: text('sha256').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    status: text('status').notNull().default('queued'),
    attempt: integer('attempt').notNull().default(0),
    generation: integer('generation').notNull().default(0),
    defaultCategoryId: text('default_category_id').references(
      () => categories.id,
    ),
    openedMonth: text('opened_month'),
    extractedJson: text('extracted_json'),
    error: text('error'),
    transactionId: text('transaction_id').references(() => transactions.id),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    unique().on(t.userId, t.sha256),
    index('captures_user_idx').on(t.userId, t.createdAt),
  ],
);
export const recommendations = sqliteTable('recommendations', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  month: text('month').notNull(),
  fingerprint: text('fingerprint').notNull(),
  summaryJson: text('summary_json').notNull(),
  proposalJson: text('proposal_json').notNull(),
  createdAt: text('created_at').notNull(),
  appliedAt: text('applied_at'),
});
