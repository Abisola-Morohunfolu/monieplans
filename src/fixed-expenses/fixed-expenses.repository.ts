import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/database.provider';
import * as schema from '../database/schema';

@Injectable()
export class FixedExpensesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>) {}

  transaction<T>(cb: (tx: any) => Promise<T>) {
    return this.db.transaction(cb);
  }

  async findCategory(categoryId: string, tx?: any) {
    const executor = tx ?? this.db;
    const [category] = await executor
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.id, categoryId));
    return category ?? null;
  }

  async createTemplate(values: typeof schema.fixedExpenseTemplates.$inferInsert, tx?: any) {
    const executor = tx ?? this.db;
    const [template] = await executor
      .insert(schema.fixedExpenseTemplates)
      .values(values)
      .returning();
    return template;
  }

  async findAllTemplates(userId: string) {
    return this.db
      .select()
      .from(schema.fixedExpenseTemplates)
      .where(eq(schema.fixedExpenseTemplates.userId, userId))
      .orderBy(desc(schema.fixedExpenseTemplates.createdAt));
  }

  async findOneTemplate(userId: string, id: string) {
    const [template] = await this.db
      .select()
      .from(schema.fixedExpenseTemplates)
      .where(and(eq(schema.fixedExpenseTemplates.userId, userId), eq(schema.fixedExpenseTemplates.id, id)));
    return template ?? null;
  }

  async updateTemplate(userId: string, id: string, setValues: Partial<typeof schema.fixedExpenseTemplates.$inferInsert>, tx?: any) {
    const executor = tx ?? this.db;
    const [updated] = await executor
      .update(schema.fixedExpenseTemplates)
      .set(setValues)
      .where(eq(schema.fixedExpenseTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteTemplate(userId: string, id: string, tx?: any) {
    const executor = tx ?? this.db;
    await executor
      .delete(schema.fixedExpenseTemplates)
      .where(and(eq(schema.fixedExpenseTemplates.userId, userId), eq(schema.fixedExpenseTemplates.id, id)));
  }

  async findBudgetPeriod(userId: string, budgetPeriodId: string) {
    const [budgetPeriod] = await this.db
      .select()
      .from(schema.budgetPeriods)
      .where(and(eq(schema.budgetPeriods.id, budgetPeriodId), eq(schema.budgetPeriods.userId, userId)));
    return budgetPeriod ?? null;
  }

  async findActiveTemplates(userId: string) {
    return this.db
      .select()
      .from(schema.fixedExpenseTemplates)
      .where(and(eq(schema.fixedExpenseTemplates.userId, userId), eq(schema.fixedExpenseTemplates.isActive, true)));
  }

  async insertFixedExpenseItems(items: (typeof schema.fixedExpenseItems.$inferInsert)[], tx?: any) {
    const executor = tx ?? this.db;
    return executor.insert(schema.fixedExpenseItems).values(items).returning();
  }
}
