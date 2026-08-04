import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/database.provider';
import * as schema from '../database/schema';

@Injectable()
export class BudgetRepository {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>) {}

  transaction<T>(cb: (tx: any) => Promise<T>) {
    return this.db.transaction(cb);
  }

  async createPeriod(values: typeof schema.budgetPeriods.$inferInsert, tx?: any) {
    const executor = tx ?? this.db;
    const [period] = await executor.insert(schema.budgetPeriods).values(values).returning();
    return period;
  }

  async findActive(userId: string) {
    const [period] = await this.db
      .select()
      .from(schema.budgetPeriods)
      .where(
        and(eq(schema.budgetPeriods.userId, userId), eq(schema.budgetPeriods.status, 'active')),
      )
      .orderBy(desc(schema.budgetPeriods.periodStartDate))
      .limit(1);
    return period ?? null;
  }

  async findAll(userId: string) {
    return this.db
      .select()
      .from(schema.budgetPeriods)
      .where(eq(schema.budgetPeriods.userId, userId))
      .orderBy(desc(schema.budgetPeriods.periodStartDate));
  }

  async findOne(userId: string, id: string) {
    const [period] = await this.db
      .select()
      .from(schema.budgetPeriods)
      .where(and(eq(schema.budgetPeriods.userId, userId), eq(schema.budgetPeriods.id, id)));
    return period ?? null;
  }

  async updatePeriod(userId: string, id: string, setValues: Partial<typeof schema.budgetPeriods.$inferInsert>, tx?: any) {
    const executor = tx ?? this.db;
    const [updated] = await executor
      .update(schema.budgetPeriods)
      .set(setValues)
      .where(and(eq(schema.budgetPeriods.userId, userId), eq(schema.budgetPeriods.id, id)))
      .returning();
    return updated;
  }

  async createWeeklyAllocation(values: typeof schema.weeklyBudgetAllocations.$inferInsert, tx?: any) {
    const executor = tx ?? this.db;
    await executor
      .insert(schema.weeklyBudgetAllocations)
      .values(values)
      .onConflictDoNothing();
  }
}
