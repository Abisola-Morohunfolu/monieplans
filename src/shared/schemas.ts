import { z } from 'zod';

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const searchQuerySchema = z.object({
  search: z.string().optional(),
});

export const monthParamSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, {
  message: 'Month must be in YYYY-MM format',
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  groupName: z.string().trim().max(100).optional(),
  kind: z.enum(['income', 'expense', 'transfer']).default('expense'),
});

export const updateProfileSchema = z.object({
  fullName: z.string().optional(),
  preferredCurrency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  timezone: z
    .string()
    .max(64)
    .refine((value) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, 'Enter a valid timezone, such as Africa/Lagos')
    .optional(),
});

export const currencyAmount = z
  .number()
  .min(0.01)
  .max(1e10)
  .refine(
    (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.0001,
    'Use at most two decimal places',
  );
const splitSchema = z.object({
  categoryId: z.string().min(1).nullable(),
  amount: currencyAmount,
});

export const createTransactionSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  amount: currencyAmount,
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  paymentStatus: z
    .enum(['completed', 'pending', 'failed'])
    .default('completed'),
  splits: z.array(splitSchema).max(50).optional(),
  id: z.string().uuid().optional(),
  occurredOn: z.string().date(),
  categoryId: z.string().min(1).nullable().optional(),
  payee: z.string().trim().max(200).nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
});

export const updateTransactionSchema = z.object({
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  type: z.enum(['income', 'expense', 'transfer']).optional(),
  amount: currencyAmount.optional(),
  paymentStatus: z.enum(['completed', 'pending', 'failed']).optional(),
  splits: z.array(splitSchema).max(50).optional(),
  occurredOn: z.string().date().optional(),
  categoryId: z.string().min(1).nullable().optional(),
  payee: z.string().trim().max(200).nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
});

export const listTransactionsQuerySchema = paginationQuerySchema.merge(
  z.object({
    month: monthParamSchema.optional(),
    categoryId: z.string().optional(),
    type: z.enum(['income', 'expense', 'transfer']).optional(),
    search: z.string().optional(),
  }),
);

export const setAssignmentsSchema = z.object({
  assignments: z
    .array(
      z.object({
        categoryId: z.string().min(1),
        assigned: z.number().min(0),
      }),
    )
    .max(500),
});

export const listCategoriesQuerySchema =
  paginationQuerySchema.merge(searchQuerySchema);

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
export type SetAssignmentsInput = z.infer<typeof setAssignmentsSchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
