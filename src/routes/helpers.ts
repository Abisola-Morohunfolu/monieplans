import { HTTPException } from 'hono/http-exception';
import { and, eq, isNull, or } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../database/schema';

export type Db = DrizzleD1Database<typeof schema>;

export const DEFAULT_CURRENCY = 'NGN';

export async function getBudgetOrThrow(
  db: Db,
  userId: string,
  month: string,
): Promise<InferSelectModel<typeof schema.budgets>> {
  const [budget] = await db
    .select()
    .from(schema.budgets)
    .where(
      and(eq(schema.budgets.userId, userId), eq(schema.budgets.month, month)),
    );
  if (!budget) throw new HTTPException(404, { message: 'Budget not found' });
  return budget;
}

export async function getPreferredCurrency(
  db: Db,
  userId: string,
): Promise<string> {
  const [profile] = await db
    .select({ preferredCurrency: schema.userProfiles.preferredCurrency })
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.userId, userId));
  return profile?.preferredCurrency ?? DEFAULT_CURRENCY;
}

export async function assertCategoryVisible(
  db: Db,
  userId: string,
  categoryId: string,
): Promise<void> {
  const [category] = await db
    .select()
    .from(schema.categories)
    .where(
      and(
        eq(schema.categories.id, categoryId),
        or(
          isNull(schema.categories.userId),
          eq(schema.categories.userId, userId),
        ),
      ),
    );
  if (!category)
    throw new HTTPException(404, { message: 'Category not found' });
}
