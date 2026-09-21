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
  kind: z.enum(['income', 'expense']).default('expense'),
});

export const updateProfileSchema = z.object({
  fullName: z.string().optional(),
  preferredCurrency: z.string().min(1).max(8).optional(),
  timezone: z.string().max(64).optional(),
});

export const createTransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  occurredOn: z.string().date(),
  categoryId: z.string().min(1).nullable().optional(),
  payee: z.string().trim().max(200).nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
});

export const updateTransactionSchema = z.object({
  type: z.enum(['income', 'expense']).optional(),
  amount: z.number().positive().optional(),
  occurredOn: z.string().date().optional(),
  categoryId: z.string().min(1).nullable().optional(),
  payee: z.string().trim().max(200).nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
});

export const listTransactionsQuerySchema = paginationQuerySchema.merge(
  z.object({
    month: monthParamSchema.optional(),
    categoryId: z.string().optional(),
    type: z.enum(['income', 'expense']).optional(),
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
