import { z } from 'zod';

const budgetCycleType = z.enum([
  'calendar_month',
  'custom_30_day',
  'custom_31_day',
]);
const planningMode = z.enum(['income_based', 'spending_cap_based']);
const weekStartDay = z.enum(['monday', 'sunday', 'saturday']);

export const createBudgetSchema = z.object({
  periodStartDate: z.string().date(),
  periodEndDate: z.string().date(),
  cycleType: budgetCycleType.optional().default('calendar_month'),
  presetMonth: z.string().optional(),
  planningMode: planningMode.default('income_based'),
  monthlyIncomeAmount: z.number().min(0).optional(),
  monthlyBudgetCapAmount: z.number().min(0).optional(),
  currency: z.string().min(1).default('NGN'),
  notes: z.string().optional(),
  activateImmediately: z.boolean().optional(),
});

export const createExpenseSchema = z.object({
  amount: z.number().min(0),
  expenseDate: z.string(),
  categoryId: z.string().optional(),
  description: z.string().optional(),
  merchantName: z.string().optional(),
  receiptId: z.string().optional(),
});

export const updateExpenseSchema = z.object({
  amount: z.number().min(0).optional(),
  expenseDate: z.string().optional(),
  categoryId: z.string().optional(),
  description: z.string().optional(),
  merchantName: z.string().optional(),
});

export const listExpensesQuerySchema = z.object({
  budgetPeriodId: z.string().optional(),
  weeklyBudgetAllocationId: z.string().optional(),
  categoryId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sourceType: z.enum(['manual', 'receipt_upload']).optional(),
  search: z.string().optional(),
});

export const createGoalSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().min(0),
  targetDate: z.string().optional(),
  priorityRank: z.number().int().min(0).max(100).optional().default(0),
  reserveInBudget: z.boolean().optional(),
  notes: z.string().optional(),
});

export const updateGoalSchema = z.object({
  name: z.string().min(1).optional(),
  targetAmount: z.number().min(0).optional(),
  targetDate: z.string().optional(),
  priorityRank: z.number().int().min(0).max(100).optional(),
  reserveInBudget: z.boolean().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'paused', 'completed', 'archived']).optional(),
});

export const updateProfileSchema = z.object({
  fullName: z.string().optional(),
  preferredCurrency: z.string().optional(),
  timezone: z.string().optional(),
  budgetCycleAnchorDay: z.number().int().min(1).max(31).optional(),
  defaultBudgetCycleType: budgetCycleType.optional(),
  weekStartDay: weekStartDay.optional(),
});

export const createFixedExpenseTemplateSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().optional(),
  amount: z.number().min(0),
  cadence: z.enum(['every_period']).optional().default('every_period'),
  defaultDueDay: z.number().int().min(1).max(31).optional(),
  isActive: z.boolean().optional(),
  isMandatory: z.boolean().optional(),
  isProtectedFromCutRecommendations: z.boolean().optional(),
  notes: z.string().optional(),
});

export const updateFixedExpenseTemplateSchema =
  createFixedExpenseTemplateSchema.partial();

export const uploadStatementQuerySchema = z.object({
  budgetPeriodId: z.string().optional(),
});

export const reserveGoalSchema = z.object({
  reservations: z.array(
    z.object({
      goalId: z.string(),
      reservedAmount: z.number().min(0),
    }),
  ),
});

export const updateRecommendationStatusSchema = z.object({
  status: z.enum(['dismissed', 'accepted']),
});

export const generateInsightsSchema = z.object({
  budgetPeriodId: z.string(),
});

export const createIncomeSchema = z.object({
  amount: z.number().min(0),
  incomeDate: z.string(),
  categoryId: z.string().optional(),
  description: z.string().optional(),
});

export const listIncomeQuerySchema = z.object({
  budgetPeriodId: z.string().optional(),
  categoryId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sourceType: z.enum(['manual', 'statement_import']).optional(),
  search: z.string().optional(),
});

export const confirmReceiptItemsSchema = z.object({
  itemIds: z.array(z.string()),
});

export const listTransactionsQuerySchema = z.object({
  hideInternal: z.enum(['true', 'false']).optional(),
  transactionType: z.string().optional(),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateFixedExpenseTemplateInput = z.infer<
  typeof createFixedExpenseTemplateSchema
>;
export type UpdateFixedExpenseTemplateInput = z.infer<
  typeof updateFixedExpenseTemplateSchema
>;
export type ReserveGoalInput = z.infer<typeof reserveGoalSchema>;
export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;
export type ListIncomeQuery = z.infer<typeof listIncomeQuerySchema>;
