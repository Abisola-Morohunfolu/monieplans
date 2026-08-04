import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { BudgetRepository } from './budget.repository';
import { GoalsService } from '../goals/goals.service';

@Injectable()
export class BudgetService {
  constructor(
    private readonly budgetRepository: BudgetRepository,
    private readonly goalsService: GoalsService,
  ) {}

  async create(userId: string, dto: CreateBudgetDto) {
    return this.budgetRepository.transaction(async (tx) => {
      const status = dto.activateImmediately ? 'active' : 'draft';
      const period = await this.budgetRepository.createPeriod(
        {
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
        },
        tx,
      );

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
    return this.budgetRepository.findActive(userId);
  }

  async findAll(userId: string) {
    return this.budgetRepository.findAll(userId);
  }

  async findOne(userId: string, id: string) {
    const period = await this.budgetRepository.findOne(userId, id);
    if (!period) throw new NotFoundException('Budget period not found');
    return period;
  }

  async activate(userId: string, id: string) {
    const period = await this.findOne(userId, id);
    if (period.status === 'active') {
      return period;
    }

    return this.budgetRepository.transaction(async (tx) => {
      const updated = await this.budgetRepository.updatePeriod(
        userId,
        id,
        { status: 'active', updatedAt: new Date() },
        tx,
      );

      const totalAmount = parseFloat(
        updated.monthlyBudgetCapAmount || updated.monthlyIncomeAmount || '0',
      );

      // Generate goal reservations (upsert) for this period, using the same tx
      await this.goalsService.reserveInBudget(userId, id, totalAmount, tx);

      // Fetch total reserved amount (within same tx so it's consistent)
      const reservedAmount = await this.goalsService.getTotalReservedAmount(id, tx);

      await this.generateWeeklyAllocations(
        tx,
        userId,
        updated.id,
        updated.periodStartDate,
        updated.periodEndDate,
        totalAmount,
        'equal_split',
        reservedAmount,
      );

      return updated;
    });
  }

  async lock(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.budgetRepository.updatePeriod(
      userId,
      id,
      { status: 'locked', lockedAt: new Date(), updatedAt: new Date() },
    );
  }

  async generateWeeklyAllocations(
    tx: any,
    userId: string,
    budgetPeriodId: string,
    startDateStr: string,
    endDateStr: string,
    totalAmount: number,
    strategy: 'equal_split' | 'calendar_aware' = 'equal_split',
    reservedAmount = 0,
  ) {
    // Deduct goal reservations before splitting — weekly allocations cover
    // only the discretionary portion of the budget.
    const spendableAmount = Math.max(0, totalAmount - reservedAmount);
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
        plannedAmount = Math.round(spendableAmount * (week.days / totalDays) * 100) / 100;
      } else {
        plannedAmount = Math.round((spendableAmount / totalWeeks) * 100) / 100;
      }

      if (i === totalWeeks - 1) {
        plannedAmount = Math.round((spendableAmount - allocatedSum) * 100) / 100;
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

      await this.budgetRepository.createWeeklyAllocation(
        {
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
        },
        tx,
      );
    }
  }
}
