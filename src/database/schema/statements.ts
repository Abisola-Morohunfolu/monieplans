import { boolean, date, integer, numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { budgetPeriods } from './budget-periods';
import { categories } from './categories';

export const uploadStatusEnum = pgEnum('upload_status', [
  'uploaded',
  'processing',
  'processed',
  'failed',
  'deleted',
]);

export const transactionDirectionEnum = pgEnum('transaction_direction', ['debit', 'credit']);

export const matchTypeEnum = pgEnum('match_type', ['merchant', 'contains_text', 'exact_text']);

export const statementUploads = pgTable('statement_uploads', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  budgetPeriodId: uuid('budget_period_id').references(() => budgetPeriods.id),
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(),
  storagePath: text('storage_path').notNull(),
  uploadStatus: uploadStatusEnum('upload_status').notNull().default('uploaded'),
  statementPeriodStart: date('statement_period_start'),
  statementPeriodEnd: date('statement_period_end'),
  parseErrorSummary: text('parse_error_summary'),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
  processedAt: timestamp('processed_at'),
});

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  statementUploadId: uuid('statement_upload_id').references(() => statementUploads.id),
  budgetPeriodId: uuid('budget_period_id').references(() => budgetPeriods.id),
  postedDate: date('posted_date').notNull(),
  descriptionRaw: text('description_raw').notNull(),
  descriptionNormalized: text('description_normalized'),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('NGN'),
  direction: transactionDirectionEnum('direction').notNull(),
  merchantName: text('merchant_name'),
  categoryId: uuid('category_id').references(() => categories.id),
  categoryConfidence: integer('category_confidence'),
  isUserCorrected: boolean('is_user_corrected').notNull().default(false),
  isExcludedFromAnalysis: boolean('is_excluded_from_analysis').notNull().default(false),
  externalHash: text('external_hash'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const transactionCategoryRules = pgTable('transaction_category_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  matchType: matchTypeEnum('match_type').notNull(),
  matchValue: text('match_value').notNull(),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => categories.id),
  priority: integer('priority').notNull().default(0),
  createdFromTransactionId: uuid('created_from_transaction_id').references(() => transactions.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
