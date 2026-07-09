import { boolean, integer, numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { budgetPeriods } from './budget-periods';
import { categories } from './categories';
import { weeklyBudgetAllocations } from './weekly-allocations';

export const expenseSourceEnum = pgEnum('expense_source', ['manual', 'receipt_upload']);

export const receiptParseStatusEnum = pgEnum('receipt_parse_status', [
  'not_applicable',
  'pending',
  'parsed',
  'failed',
  'confirmed',
]);

export const fileParseStatusEnum = pgEnum('file_parse_status', [
  'uploaded',
  'processing',
  'parsed',
  'failed',
  'confirmed',
  'deleted',
]);

export const expenseEntries = pgTable('expense_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  budgetPeriodId: uuid('budget_period_id')
    .notNull()
    .references(() => budgetPeriods.id, { onDelete: 'cascade' }),
  weeklyBudgetAllocationId: uuid('weekly_budget_allocation_id').references(
    () => weeklyBudgetAllocations.id,
  ),
  categoryId: uuid('category_id').references(() => categories.id),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  expenseDate: text('expense_date').notNull(),
  description: text('description'),
  sourceType: expenseSourceEnum('source_type').notNull().default('manual'),
  merchantName: text('merchant_name'),
  receiptParseConfidence: integer('receipt_parse_confidence'),
  receiptParseStatus: receiptParseStatusEnum('receipt_parse_status')
    .notNull()
    .default('not_applicable'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const expenseEntryReceipts = pgTable('expense_entry_receipts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  expenseEntryId: uuid('expense_entry_id').references(() => expenseEntries.id),
  fileName: text('file_name').notNull(),
  storagePath: text('storage_path').notNull(),
  parseStatus: fileParseStatusEnum('parse_status').notNull().default('uploaded'),
  parsedAmount: numeric('parsed_amount', { precision: 15, scale: 2 }),
  parsedExpenseDate: text('parsed_expense_date'),
  parsedMerchantName: text('parsed_merchant_name'),
  rawParserOutputJson: text('raw_parser_output_json'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  processedAt: timestamp('processed_at'),
  deletedAt: timestamp('deleted_at'),
});
