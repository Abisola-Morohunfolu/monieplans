import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/database.provider';
import * as schema from '../database/schema';
import { CreateBudgetDto } from './dto/create-budget.dto';

@Injectable()
export class BudgetService {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>) {}

  async create(userId: string, dto: CreateBudgetDto) {
    return this.db.transaction(async (tx) => {
      const status = dto.activateImmediately ? 'active' : 'draft';
      const [period] = await tx
        .insert(schema.budgetPeriods)
        .values({
          userId,
          periodStartDate: dto.periodStartDate,
          periodEndDate: dto.periodEndDate,
          cycleType: dto.cycleType ?? 'calendar_month',
          presetMonth: dto.presetMonth,
          planningMode: dto.planningMode,
          monthlyIncomeAmount: dto.monthlyIncomeAmount?.toString(),
          monthlyBudgetCapAmount: dto.monthlyBudgetCapAmount?.toString(),
          currency: dto.currency,
          notes: dto.notes,
          status,
        })
        .returning();

      if (dto.activateImmediately) {
        const totalAmount = parseFloat(
          period.monthlyBudgetCapAmount || period.monthlyIncomeAmount || '0',
        );
        await this.generateWeeklyAllocations(
          tx,
          userId,
          period.id,
          period.periodStartDate,
          period.periodEndDate,
          totalAmount,
        );
      }

      return period;
    });
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
    if (!period) throw new NotFoundException('Budget period not found');
    return period;
  }

  async activate(userId: string, id: string) {
    const period = await this.findOne(userId, id);
    if (period.status === 'active') {
      return period;
    }

    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(schema.budgetPeriods)
        .set({ status: 'active', updatedAt: new Date() })
        .where(and(eq(schema.budgetPeriods.userId, userId), eq(schema.budgetPeriods.id, id)))
        .returning();

      const totalAmount = parseFloat(
        updated.monthlyBudgetCapAmount || updated.monthlyIncomeAmount || '0',
      );
      await this.generateWeeklyAllocations(
        tx,
        userId,
        updated.id,
        updated.periodStartDate,
        updated.periodEndDate,
        totalAmount,
      );

      return updated;
    });
  }

  async lock(userId: string, id: string) {
    await this.findOne(userId, id);
    const [updated] = await this.db
      .update(schema.budgetPeriods)
      .set({ status: 'locked', lockedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(schema.budgetPeriods.userId, userId), eq(schema.budgetPeriods.id, id)))
      .returning();
    return updated;
  }

  async generateWeeklyAllocations(
    tx: any,
    userId: string,
    budgetPeriodId: string,
    startDateStr: string,
    endDateStr: string,
    totalAmount: number,
    strategy: 'equal_split' | 'calendar_aware' = 'equal_split',
  ) {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    const weeks: { start: Date; end: Date; days: number }[] = [];
    const currentStart = new Date(start.getTime());

    while (currentStart <= end) {
      const currentEnd = new Date(currentStart.getTime() + 6 * 24 * 60 * 60 * 1000);
      let finalEnd = currentEnd;
      if (currentEnd > end) {
        finalEnd = new Date(end.getTime());
      }

      const days =
        Math.round((finalEnd.getTime() - currentStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      weeks.push({
        start: new Date(currentStart.getTime()),
        end: new Date(finalEnd.getTime()),
        days,
      });

      currentStart.setDate(finalEnd.getDate() + 1);
      // Ensure we advance the month if date arithmetic rolls over
      if (currentStart.getTime() <= finalEnd.getTime()) {
        currentStart.setTime(finalEnd.getTime() + 24 * 60 * 60 * 1000);
      }
    }

    const totalWeeks = weeks.length;
    if (totalWeeks === 0) return;

    const totalDays = weeks.reduce((sum, w) => sum + w.days, 0);
    let allocatedSum = 0;

    for (let i = 0; i < totalWeeks; i++) {
      const week = weeks[i];
      let plannedAmount = 0;

      if (strategy === 'calendar_aware') {
        plannedAmount = Math.round(totalAmount * (week.days / totalDays) * 100) / 100;
      } else {
        plannedAmount = Math.round((totalAmount / totalWeeks) * 100) / 100;
      }

      if (i === totalWeeks - 1) {
        plannedAmount = Math.round((totalAmount - allocatedSum) * 100) / 100;
      } else {
        allocatedSum += plannedAmount;
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const startStr = week.start.toISOString().split('T')[0];
      const endStr = week.end.toISOString().split('T')[0];

      let status: 'upcoming' | 'current' | 'completed' = 'upcoming';
      if (todayStr >= startStr && todayStr <= endStr) {
        status = 'current';
      } else if (todayStr > endStr) {
        status = 'completed';
      }

      await tx
        .insert(schema.weeklyBudgetAllocations)
        .values({
          budgetPeriodId,
          userId,
          weekIndex: i,
          weekStartDate: startStr,
          weekEndDate: endStr,
          allocationStrategy: strategy,
          plannedAmount: plannedAmount.toFixed(2),
          adjustmentAmount: '0.00',
          finalPlannedAmount: plannedAmount.toFixed(2),
          actualSpentAmountCache: '0.00',
          remainingAmountCache: plannedAmount.toFixed(2),
          status,
        })
        .onConflictDoNothing();
    }
  }
}
