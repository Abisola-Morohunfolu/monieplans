import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { user } from './auth';
import { budgetPeriods } from './budget-periods';
import { categories } from './categories';
import { weeklyBudgetAllocations } from './weekly-allocations';

export const expenseEntries = sqliteTable('expense_entries', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  budgetPeriodId: text('budget_period_id')
    .notNull()
    .references(() => budgetPeriods.id, { onDelete: 'cascade' }),
  weeklyBudgetAllocationId: text('weekly_budget_allocation_id').references(
    () => weeklyBudgetAllocations.id,
  ),
  categoryId: text('category_id').references(() => categories.id),
  amountCents: integer('amount_cents').notNull(),
  expenseDate: text('expense_date').notNull(),
  description: text('description'),
  sourceType: text('source_type').notNull().default('manual'),
  merchantName: text('merchant_name'),
  receiptParseConfidence: integer('receipt_parse_confidence'),
  receiptParseStatus: text('receipt_parse_status').notNull().default('not_applicable'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text('deleted_at'),
});

export const expenseEntryReceipts = sqliteTable('expense_entry_receipts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  expenseEntryId: text('expense_entry_id').references(() => expenseEntries.id),
  fileName: text('file_name').notNull(),
  storagePath: text('storage_path').notNull(),
  parseStatus: text('parse_status').notNull().default('uploaded'),
  parsedAmountCents: integer('parsed_amount_cents'),
  parsedExpenseDate: text('parsed_expense_date'),
  parsedMerchantName: text('parsed_merchant_name'),
  rawParserOutputJson: text('raw_parser_output_json'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  processedAt: text('processed_at'),
  deletedAt: text('deleted_at'),
});
