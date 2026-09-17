import { HTTPException } from 'hono/http-exception';
import { and, desc, eq, gte, isNull, lte, or, sql } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import type { InferSelectModel } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../database/schema';
import { nowISO, generateId } from '../shared/utils';

export type D1Query = BatchItem<'sqlite'>;
export type Db = DrizzleD1Database<typeof schema>;

export async function getBudgetPeriodOrThrow(
  db: Db,
  userId: string,
  id: string,
): Promise<InferSelectModel<typeof schema.budgetPeriods>> {
  const [period] = await db
    .select()
    .from(schema.budgetPeriods)
    .where(
      and(
        eq(schema.budgetPeriods.userId, userId),
        eq(schema.budgetPeriods.id, id),
      ),
    );
  if (!period)
    throw new HTTPException(404, { message: 'Budget period not found' });
  return period;
}

export async function getActiveBudgetPeriod(
  db: Db,
  userId: string,
): Promise<InferSelectModel<typeof schema.budgetPeriods>> {
  const [period] = await db
    .select()
    .from(schema.budgetPeriods)
    .where(
      and(
        eq(schema.budgetPeriods.userId, userId),
        eq(schema.budgetPeriods.status, 'active'),
      ),
    )
    .orderBy(desc(schema.budgetPeriods.periodStartDate))
    .limit(1);
  if (!period)
    throw new HTTPException(400, {
      message:
        'No active budget period found. Please activate a budget period first.',
    });
  return period;
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

export async function findWeekForDate(
  db: Db,
  budgetPeriodId: string,
  date: string,
): Promise<
  InferSelectModel<typeof schema.weeklyBudgetAllocations> | undefined
> {
  const [week] = await db
    .select()
    .from(schema.weeklyBudgetAllocations)
    .where(
      and(
        eq(schema.weeklyBudgetAllocations.budgetPeriodId, budgetPeriodId),
        lte(schema.weeklyBudgetAllocations.weekStartDate, date),
        gte(schema.weeklyBudgetAllocations.weekEndDate, date),
      ),
    )
    .limit(1);
  return week;
}

export async function resolveReceiptContext(
  db: Db,
  userId: string,
  receiptId: string,
  fallbackMerchantName: string | null,
): Promise<{ sourceType: string; merchantName: string | null }> {
  const [receipt] = await db
    .select()
    .from(schema.expenseEntryReceipts)
    .where(
      and(
        eq(schema.expenseEntryReceipts.id, receiptId),
        eq(schema.expenseEntryReceipts.userId, userId),
        isNull(schema.expenseEntryReceipts.deletedAt),
      ),
    );
  if (!receipt) throw new HTTPException(404, { message: 'Receipt not found' });

  return {
    sourceType: 'receipt_upload',
    merchantName: fallbackMerchantName ?? receipt.parsedMerchantName ?? null,
  };
}

export function buildWeekCacheUpdate(
  db: Db,
  weekId: string,
  deltaCents: number,
): D1Query {
  return db
    .update(schema.weeklyBudgetAllocations)
    .set({
      actualSpentAmountCentsCache: sql`coalesce(${schema.weeklyBudgetAllocations.actualSpentAmountCentsCache}, 0) + ${deltaCents}`,
      remainingAmountCentsCache: sql`${schema.weeklyBudgetAllocations.finalPlannedAmountCents} - (coalesce(${schema.weeklyBudgetAllocations.actualSpentAmountCentsCache}, 0) + ${deltaCents})`,
      updatedAt: nowISO(),
    })
    .where(eq(schema.weeklyBudgetAllocations.id, weekId));
}

export async function generateFixedExpenseItemsForPeriod(
  db: Db,
  userId: string,
  budgetPeriod: { id: string; periodStartDate: string },
): Promise<InferSelectModel<typeof schema.fixedExpenseItems>[]> {
  const activeTemplates = await db
    .select()
    .from(schema.fixedExpenseTemplates)
    .where(
      and(
        eq(schema.fixedExpenseTemplates.userId, userId),
        eq(schema.fixedExpenseTemplates.isActive, true),
      ),
    );

  if (activeTemplates.length === 0) return [];

  const existingItems = await db
    .select({
      fixedExpenseTemplateId: schema.fixedExpenseItems.fixedExpenseTemplateId,
    })
    .from(schema.fixedExpenseItems)
    .where(eq(schema.fixedExpenseItems.budgetPeriodId, budgetPeriod.id));

  const existingTemplateIds = new Set(
    existingItems
      .map((e) => e.fixedExpenseTemplateId)
      .filter((id): id is string => id != null),
  );

  const itemsToInsert = activeTemplates
    .filter((t) => !existingTemplateIds.has(t.id))
    .map((t) => {
      let dueDate: string | null = null;
      if (t.defaultDueDay && budgetPeriod.periodStartDate) {
        const d = new Date(budgetPeriod.periodStartDate);
        d.setDate(t.defaultDueDay);
        dueDate = d.toISOString().split('T')[0];
      }

      return {
        id: generateId(),
        userId,
        budgetPeriodId: budgetPeriod.id,
        fixedExpenseTemplateId: t.id,
        name: t.name,
        categoryId: t.categoryId,
        amountCents: t.amountCents,
        dueDate,
        originType: 'recurring_template',
        inclusionStatus: 'included',
        isMandatory: t.isMandatory,
        isProtectedFromCutRecommendations: t.isProtectedFromCutRecommendations,
        notes: t.notes,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
    });

  if (itemsToInsert.length === 0) return [];

  return db.insert(schema.fixedExpenseItems).values(itemsToInsert).returning();
}

export async function sumFixedExpenseItemsCents(
  db: Db,
  budgetPeriodId: string,
): Promise<number> {
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${schema.fixedExpenseItems.amountCents}), 0)`,
    })
    .from(schema.fixedExpenseItems)
    .where(
      and(
        eq(schema.fixedExpenseItems.budgetPeriodId, budgetPeriodId),
        eq(schema.fixedExpenseItems.inclusionStatus, 'included'),
      ),
    );
  return Number(row?.total ?? 0);
}
