import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { user } from './auth';
import { budgetPeriods } from './budget-periods';
import { categories } from './categories';

export const statementUploads = sqliteTable('statement_uploads', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  budgetPeriodId: text('budget_period_id').references(() => budgetPeriods.id),
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(),
  storagePath: text('storage_path').notNull(),
  uploadStatus: text('upload_status').notNull().default('uploaded'),
  statementPeriodStart: text('statement_period_start'),
  statementPeriodEnd: text('statement_period_end'),
  parseErrorSummary: text('parse_error_summary'),
  uploadedAt: text('uploaded_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  processedAt: text('processed_at'),
});

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  statementUploadId: text('statement_upload_id').references(() => statementUploads.id),
  budgetPeriodId: text('budget_period_id').references(() => budgetPeriods.id),
  postedDate: text('posted_date').notNull(),
  descriptionRaw: text('description_raw').notNull(),
  descriptionNormalized: text('description_normalized'),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').notNull().default('NGN'),
  direction: text('direction').notNull(),
  merchantName: text('merchant_name'),
  categoryId: text('category_id').references(() => categories.id),
  categoryConfidence: integer('category_confidence'),
  isUserCorrected: integer('is_user_corrected', { mode: 'boolean' }).notNull().default(false),
  isExcludedFromAnalysis: integer('is_excluded_from_analysis', { mode: 'boolean' })
    .notNull()
    .default(false),
  externalHash: text('external_hash'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const transactionCategoryRules = sqliteTable('transaction_category_rules', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  matchType: text('match_type').notNull(),
  matchValue: text('match_value').notNull(),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id),
  priority: integer('priority').notNull().default(0),
  createdFromTransactionId: text('created_from_transaction_id').references(() => transactions.id),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});
