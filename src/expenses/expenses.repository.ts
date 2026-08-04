import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, ilike, isNull, lte, or } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/database.provider';
import * as schema from '../database/schema';
import { ListExpensesDto } from './dto/list-expenses.dto';

@Injectable()
export class ExpensesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>) {}

  transaction<T>(cb: (tx: any) => Promise<T>) {
    return this.db.transaction(cb);
  }

  async getActiveBudgetPeriod(userId: string, tx?: any) {
    const executor = tx ?? this.db;
    const [budgetPeriod] = await executor
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
    return budgetPeriod ?? null;
  }

  async getWeeklyAllocationForDate(budgetPeriodId: string, date: string, tx?: any) {
    const executor = tx ?? this.db;
    const [week] = await executor
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
    return week ?? null;
  }

  async getCategoryByIdAndUser(categoryId: string, userId: string, tx?: any) {
    const executor = tx ?? this.db;
    const [cat] = await executor
      .select()
      .from(schema.categories)
      .where(
        and(
          eq(schema.categories.id, categoryId),
          or(isNull(schema.categories.userId), eq(schema.categories.userId, userId)),
        ),
      );
    return cat ?? null;
  }

  async getReceiptByIdAndUser(receiptId: string, userId: string, tx?: any) {
    const executor = tx ?? this.db;
    const [receipt] = await executor
      .select()
      .from(schema.expenseEntryReceipts)
      .where(
        and(
          eq(schema.expenseEntryReceipts.id, receiptId),
          eq(schema.expenseEntryReceipts.userId, userId),
          isNull(schema.expenseEntryReceipts.deletedAt),
        ),
      );
    return receipt ?? null;
  }

  async createExpenseEntry(values: typeof schema.expenseEntries.$inferInsert, tx?: any) {
    const executor = tx ?? this.db;
    const [expense] = await executor
      .insert(schema.expenseEntries)
      .values(values)
      .returning();
    return expense;
  }

  async updateReceipt(id: string, setValues: Partial<typeof schema.expenseEntryReceipts.$inferInsert>, tx?: any) {
    const executor = tx ?? this.db;
    const [receipt] = await executor
      .update(schema.expenseEntryReceipts)
      .set(setValues)
      .where(eq(schema.expenseEntryReceipts.id, id))
      .returning();
    return receipt;
  }

  async getWeeklyAllocation(id: string, tx?: any) {
    const executor = tx ?? this.db;
    const [week] = await executor
      .select()
      .from(schema.weeklyBudgetAllocations)
      .where(eq(schema.weeklyBudgetAllocations.id, id));
    return week ?? null;
  }

  async getWeeklyAllocationExpenses(weekId: string, tx?: any) {
    const executor = tx ?? this.db;
    return executor
      .select({ amount: schema.expenseEntries.amount })
      .from(schema.expenseEntries)
      .where(
        and(
          eq(schema.expenseEntries.weeklyBudgetAllocationId, weekId),
          isNull(schema.expenseEntries.deletedAt),
        ),
      );
  }

  async updateWeeklyAllocation(id: string, setValues: Partial<typeof schema.weeklyBudgetAllocations.$inferInsert>, tx?: any) {
    const executor = tx ?? this.db;
    await executor
      .update(schema.weeklyBudgetAllocations)
      .set(setValues)
      .where(eq(schema.weeklyBudgetAllocations.id, id));
  }

  async findAllExpenses(userId: string, dto: ListExpensesDto) {
    const conditions = [
      eq(schema.expenseEntries.userId, userId),
      isNull(schema.expenseEntries.deletedAt),
    ];

    if (dto.budgetPeriodId) {
      conditions.push(eq(schema.expenseEntries.budgetPeriodId, dto.budgetPeriodId));
    }
    if (dto.weeklyBudgetAllocationId) {
      conditions.push(eq(schema.expenseEntries.weeklyBudgetAllocationId, dto.weeklyBudgetAllocationId));
    }
    if (dto.categoryId) {
      conditions.push(eq(schema.expenseEntries.categoryId, dto.categoryId));
    }
    if (dto.startDate) {
      conditions.push(gte(schema.expenseEntries.expenseDate, dto.startDate));
    }
    if (dto.endDate) {
      conditions.push(lte(schema.expenseEntries.expenseDate, dto.endDate));
    }
    if (dto.sourceType) {
      conditions.push(eq(schema.expenseEntries.sourceType, dto.sourceType));
    }
    if (dto.search) {
      conditions.push(
        or(
          ilike(schema.expenseEntries.description, `%${dto.search}%`),
          ilike(schema.expenseEntries.merchantName, `%${dto.search}%`),
        ) as any,
      );
    }

    return this.db
      .select({
        id: schema.expenseEntries.id,
        userId: schema.expenseEntries.userId,
        budgetPeriodId: schema.expenseEntries.budgetPeriodId,
        weeklyBudgetAllocationId: schema.expenseEntries.weeklyBudgetAllocationId,
        categoryId: schema.expenseEntries.categoryId,
        categoryName: schema.categories.name,
        categoryCode: schema.categories.code,
        amount: schema.expenseEntries.amount,
        expenseDate: schema.expenseEntries.expenseDate,
        description: schema.expenseEntries.description,
        sourceType: schema.expenseEntries.sourceType,
        merchantName: schema.expenseEntries.merchantName,
        receiptParseConfidence: schema.expenseEntries.receiptParseConfidence,
        receiptParseStatus: schema.expenseEntries.receiptParseStatus,
        createdAt: schema.expenseEntries.createdAt,
        updatedAt: schema.expenseEntries.updatedAt,
      })
      .from(schema.expenseEntries)
      .leftJoin(schema.categories, eq(schema.expenseEntries.categoryId, schema.categories.id))
      .where(and(...conditions))
      .orderBy(desc(schema.expenseEntries.expenseDate), desc(schema.expenseEntries.createdAt));
  }

  async findOneExpense(userId: string, id: string) {
    const [expense] = await this.db
      .select({
        id: schema.expenseEntries.id,
        userId: schema.expenseEntries.userId,
        budgetPeriodId: schema.expenseEntries.budgetPeriodId,
        weeklyBudgetAllocationId: schema.expenseEntries.weeklyBudgetAllocationId,
        categoryId: schema.expenseEntries.categoryId,
        categoryName: schema.categories.name,
        categoryCode: schema.categories.code,
        amount: schema.expenseEntries.amount,
        expenseDate: schema.expenseEntries.expenseDate,
        description: schema.expenseEntries.description,
        sourceType: schema.expenseEntries.sourceType,
        merchantName: schema.expenseEntries.merchantName,
        receiptParseConfidence: schema.expenseEntries.receiptParseConfidence,
        receiptParseStatus: schema.expenseEntries.receiptParseStatus,
        createdAt: schema.expenseEntries.createdAt,
        updatedAt: schema.expenseEntries.updatedAt,
      })
      .from(schema.expenseEntries)
      .leftJoin(schema.categories, eq(schema.expenseEntries.categoryId, schema.categories.id))
      .where(
        and(
          eq(schema.expenseEntries.id, id),
          eq(schema.expenseEntries.userId, userId),
          isNull(schema.expenseEntries.deletedAt),
        ),
      );
    return expense ?? null;
  }

  async updateExpenseEntry(id: string, setValues: Partial<typeof schema.expenseEntries.$inferInsert>, tx?: any) {
    const executor = tx ?? this.db;
    const [updated] = await executor
      .update(schema.expenseEntries)
      .set(setValues)
      .where(eq(schema.expenseEntries.id, id))
      .returning();
    return updated;
  }

  async softDeleteReceiptsByExpenseId(expenseId: string, tx?: any) {
    const executor = tx ?? this.db;
    await executor
      .update(schema.expenseEntryReceipts)
      .set({ deletedAt: new Date() })
      .where(eq(schema.expenseEntryReceipts.expenseEntryId, expenseId));
  }

  async createReceipt(values: typeof schema.expenseEntryReceipts.$inferInsert, tx?: any) {
    const executor = tx ?? this.db;
    const [receipt] = await executor
      .insert(schema.expenseEntryReceipts)
      .values(values)
      .returning();
    return receipt;
  }
}
