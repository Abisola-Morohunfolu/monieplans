import { Injectable, NotFoundException } from '@nestjs/common';
import { GoalsRepository } from './goals.repository';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@Injectable()
export class GoalsService {
  constructor(private readonly goalsRepository: GoalsRepository) {}

  async create(userId: string, dto: CreateGoalDto) {
    return this.goalsRepository.createGoal({
      userId,
      name: dto.name,
      targetAmount: dto.targetAmount.toString(),
      targetDate: dto.targetDate,
      priorityRank: dto.priorityRank ?? 0,
      reserveInBudget: dto.reserveInBudget ?? false,
      notes: dto.notes,
    });
  }

  async findAll(userId: string) {
    return this.goalsRepository.findAllGoals(userId);
  }

  async findOne(userId: string, id: string) {
    const goal = await this.goalsRepository.findOneGoal(userId, id);
    if (!goal) throw new NotFoundException('Savings goal not found');
    return goal;
  }

  async update(userId: string, id: string, dto: UpdateGoalDto) {
    await this.findOne(userId, id);

    const setValues: Record<string, any> = { updatedAt: new Date() };

    if (dto.name !== undefined) setValues.name = dto.name;
    if (dto.targetAmount !== undefined) setValues.targetAmount = dto.targetAmount.toString();
    if (dto.targetDate !== undefined) setValues.targetDate = dto.targetDate;
    if (dto.priorityRank !== undefined) setValues.priorityRank = dto.priorityRank;
    if (dto.reserveInBudget !== undefined) setValues.reserveInBudget = dto.reserveInBudget;
    if (dto.notes !== undefined) setValues.notes = dto.notes;
    if (dto.status !== undefined) setValues.status = dto.status;

    return this.goalsRepository.updateGoal(userId, id, setValues);
  }

  async archive(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.goalsRepository.updateGoal(userId, id, {
      status: 'archived',
      updatedAt: new Date(),
    });
  }

  /**
   * Generates (or replaces) goal_budget_reservations for all active goals
   * where reserveInBudget = true, for the given budget period.
   *
   * Accepts an optional external transaction (tx) so it can be called from
   * within another service's transaction without nesting.
   *
   * The recommended monthly contribution is computed as:
   *   remaining = targetAmount - currentSavedAmount
   *   monthsLeft = months between today and targetDate (if set)
   *   recommendedAmount = remaining / monthsLeft  (or remaining if no targetDate)
   *
   * Feasibility is determined by comparing recommended vs available budget:
   *   - If no targetDate is set, feasibility is always 'on_track'.
   */
  async reserveInBudget(userId: string, budgetPeriodId: string, availableBudget?: number, tx?: any) {
    const period = await this.goalsRepository.findBudgetPeriod(userId, budgetPeriodId);
    if (!period) throw new NotFoundException('Budget period not found');

    const goals = await this.goalsRepository.findActiveGoalsForReservation(userId);

    if (goals.length === 0) {
      return [];
    }

    const runInserts = async (executor: any) => {
      const reservations: any[] = [];

      for (const goal of goals) {
        const targetAmount = parseFloat(goal.targetAmount);
        const currentSaved = parseFloat(goal.currentSavedAmount);
        const remaining = Math.max(0, targetAmount - currentSaved);

        let recommendedAmount = remaining;
        let feasibilityStatus: 'on_track' | 'at_risk' | 'unrealistic' = 'on_track';
        let feasibilityReason: string | null = null;

        if (goal.targetDate) {
          const today = new Date();
          const target = new Date(goal.targetDate);
          const msPerMonth = 1000 * 60 * 60 * 24 * 30.44;
          const monthsLeft = Math.max(
            1,
            Math.round((target.getTime() - today.getTime()) / msPerMonth),
          );

          recommendedAmount = Math.round((remaining / monthsLeft) * 100) / 100;

          if (availableBudget !== undefined && recommendedAmount > availableBudget * 0.5) {
            feasibilityStatus = 'unrealistic';
            feasibilityReason = `Monthly contribution of ${recommendedAmount} exceeds 50% of available budget`;
          } else if (availableBudget !== undefined && recommendedAmount > availableBudget * 0.25) {
            feasibilityStatus = 'at_risk';
            feasibilityReason = `Monthly contribution of ${recommendedAmount} is above 25% of available budget`;
          }
        }

        const reservation = await this.goalsRepository.upsertReservation(
          {
            budgetPeriodId,
            goalId: goal.id,
            reservedAmount: recommendedAmount.toFixed(2),
            recommendedAmount: recommendedAmount.toFixed(2),
            feasibilityStatus,
            feasibilityReason,
          },
          executor,
        );

        reservations.push(reservation);
      }

      return reservations;
    };

    // If an external tx was supplied (e.g. from BudgetService.activate), use it directly
    // to avoid nested transactions.
    if (tx) {
      return runInserts(tx);
    }

    return this.goalsRepository.transaction(runInserts);
  }

  async getReservationsForPeriod(userId: string, budgetPeriodId: string) {
    const period = await this.goalsRepository.findBudgetPeriod(userId, budgetPeriodId);
    if (!period) throw new NotFoundException('Budget period not found');
    return this.goalsRepository.findReservationsByPeriod(budgetPeriodId);
  }

  /**
   * Returns the total amount reserved from goals for a given budget period.
   * Used by BudgetService to deduct before weekly allocation splitting.
   */
  async getTotalReservedAmount(budgetPeriodId: string, tx?: any): Promise<number> {
    return this.goalsRepository.getTotalReservedAmount(budgetPeriodId, tx);
  }
}
