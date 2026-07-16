import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/database.provider';
import * as schema from '../database/schema';

@Injectable()
export class GoalsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>) {}

  transaction<T>(cb: (tx: any) => Promise<T>) {
    return this.db.transaction(cb);
  }

  // ─── Savings Goals ────────────────────────────────────────────────────────

  async createGoal(values: typeof schema.savingsGoals.$inferInsert, tx?: any) {
    const executor = tx ?? this.db;
    const [goal] = await executor.insert(schema.savingsGoals).values(values).returning();
    return goal;
  }

  async findAllGoals(userId: string) {
    return this.db
      .select()
      .from(schema.savingsGoals)
      .where(eq(schema.savingsGoals.userId, userId))
      .orderBy(schema.savingsGoals.priorityRank, desc(schema.savingsGoals.createdAt));
  }

  async findOneGoal(userId: string, id: string) {
    const [goal] = await this.db
      .select()
      .from(schema.savingsGoals)
      .where(and(eq(schema.savingsGoals.userId, userId), eq(schema.savingsGoals.id, id)));
    return goal ?? null;
  }

  async updateGoal(
    userId: string,
    id: string,
    setValues: Partial<typeof schema.savingsGoals.$inferInsert>,
    tx?: any,
  ) {
    const executor = tx ?? this.db;
    const [updated] = await executor
      .update(schema.savingsGoals)
      .set(setValues)
      .where(and(eq(schema.savingsGoals.userId, userId), eq(schema.savingsGoals.id, id)))
      .returning();
    return updated;
  }

  // ─── Budget Reservations ──────────────────────────────────────────────────

  async findBudgetPeriod(userId: string, budgetPeriodId: string) {
    const [period] = await this.db
      .select()
      .from(schema.budgetPeriods)
      .where(
        and(eq(schema.budgetPeriods.id, budgetPeriodId), eq(schema.budgetPeriods.userId, userId)),
      );
    return period ?? null;
  }

  async findActiveGoalsForReservation(userId: string) {
    return this.db
      .select()
      .from(schema.savingsGoals)
      .where(
        and(
          eq(schema.savingsGoals.userId, userId),
          eq(schema.savingsGoals.status, 'active'),
          eq(schema.savingsGoals.reserveInBudget, true),
        ),
      )
      .orderBy(schema.savingsGoals.priorityRank);
  }

  /**
   * Upserts a goal budget reservation for a specific goal + period pair.
   * If a reservation already exists it is fully replaced (per approved design).
   */
  async upsertReservation(
    values: typeof schema.goalBudgetReservations.$inferInsert,
    tx?: any,
  ) {
    const executor = tx ?? this.db;
    const [reservation] = await executor
      .insert(schema.goalBudgetReservations)
      .values(values)
      .onConflictDoUpdate({
        target: [
          schema.goalBudgetReservations.budgetPeriodId,
          schema.goalBudgetReservations.goalId,
        ],
        set: {
          reservedAmount: values.reservedAmount,
          recommendedAmount: values.recommendedAmount,
          feasibilityStatus: values.feasibilityStatus,
          feasibilityReason: values.feasibilityReason,
          updatedAt: sql`now()`,
        },
      })
      .returning();
    return reservation;
  }

  async findReservationsByPeriod(budgetPeriodId: string, tx?: any) {
    const executor = tx ?? this.db;
    return executor
      .select()
      .from(schema.goalBudgetReservations)
      .where(eq(schema.goalBudgetReservations.budgetPeriodId, budgetPeriodId));
  }

  async getTotalReservedAmount(budgetPeriodId: string, tx?: any): Promise<number> {
    const executor = tx ?? this.db;
    const rows = await executor
      .select({ reservedAmount: schema.goalBudgetReservations.reservedAmount })
      .from(schema.goalBudgetReservations)
      .where(eq(schema.goalBudgetReservations.budgetPeriodId, budgetPeriodId));

    return rows.reduce((sum: number, r: { reservedAmount: string }) => sum + parseFloat(r.reservedAmount), 0);
  }
}
