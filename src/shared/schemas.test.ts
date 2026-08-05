import { describe, it, expect } from 'vitest';
import {
  createBudgetSchema,
  createExpenseSchema,
  updateExpenseSchema,
  createGoalSchema,
  updateGoalSchema,
  updateProfileSchema,
  createFixedExpenseTemplateSchema,
  updateFixedExpenseTemplateSchema,
  reserveGoalSchema,
  updateRecommendationStatusSchema,
  generateInsightsSchema,
} from './schemas';

describe('Zod schemas', () => {
  describe('createBudgetSchema', () => {
    const validBudget = {
      periodStartDate: '2026-08-01',
      periodEndDate: '2026-08-31',
      planningMode: 'income_based' as const,
      currency: 'NGN',
    };

    it('accepts valid input', () => {
      expect(() => createBudgetSchema.parse(validBudget)).not.toThrow();
    });

    it('applies defaults', () => {
      const result = createBudgetSchema.parse(validBudget);
      expect(result.cycleType).toBe('calendar_month');
      expect(result.planningMode).toBe('income_based');
      expect(result.currency).toBe('NGN');
    });

    it('rejects invalid planningMode', () => {
      expect(() =>
        createBudgetSchema.parse({ ...validBudget, planningMode: 'invalid' }),
      ).toThrow();
    });

    it('accepts optional monthlyIncomeAmount', () => {
      const result = createBudgetSchema.parse({
        ...validBudget,
        monthlyIncomeAmount: 100000,
      });
      expect(result.monthlyIncomeAmount).toBe(100000);
    });
  });

  describe('createExpenseSchema', () => {
    const validExpense = {
      amount: 100,
      expenseDate: '2026-08-01',
    };

    it('accepts valid input', () => {
      expect(() => createExpenseSchema.parse(validExpense)).not.toThrow();
    });

    it('rejects zero amount', () => {
      expect(() =>
        createExpenseSchema.parse({ ...validExpense, amount: 0 }),
      ).toThrow();
    });

    it('rejects negative amount', () => {
      expect(() =>
        createExpenseSchema.parse({ ...validExpense, amount: -50 }),
      ).toThrow();
    });
  });

  describe('updateExpenseSchema', () => {
    it('allows partial update', () => {
      const result = updateExpenseSchema.parse({ amount: 200 });
      expect(result.amount).toBe(200);
    });

    it('allows empty object', () => {
      expect(() => updateExpenseSchema.parse({})).not.toThrow();
    });
  });

  describe('createGoalSchema', () => {
    it('accepts valid goal', () => {
      const result = createGoalSchema.parse({
        name: 'Emergency Fund',
        targetAmount: 500000,
      });
      expect(result.name).toBe('Emergency Fund');
      expect(result.targetAmount).toBe(500000);
      expect(result.priorityRank).toBe(0);
    });
  });

  describe('updateGoalSchema', () => {
    it('allows partial updates', () => {
      const result = updateGoalSchema.parse({ name: 'Updated Goal' });
      expect(result.name).toBe('Updated Goal');
    });

    it('validates status enum', () => {
      expect(() =>
        updateGoalSchema.parse({ status: 'invalid' }),
      ).toThrow();
      expect(() =>
        updateGoalSchema.parse({ status: 'active' }),
      ).not.toThrow();
    });
  });

  describe('createFixedExpenseTemplateSchema', () => {
    it('accepts valid template', () => {
      const result = createFixedExpenseTemplateSchema.parse({
        name: 'Rent',
        amount: 50000,
      });
      expect(result.cadence).toBe('every_period');
    });

    it('rejects negative amount', () => {
      expect(() =>
        createFixedExpenseTemplateSchema.parse({ name: 'Rent', amount: -10 }),
      ).toThrow();
    });
  });

  describe('reserveGoalSchema', () => {
    it('accepts valid reservations', () => {
      const result = reserveGoalSchema.parse({
        reservations: [
          { goalId: 'abc', reservedAmount: 1000 },
          { goalId: 'def', reservedAmount: 500 },
        ],
      });
      expect(result.reservations).toHaveLength(2);
    });

    it('rejects negative reservedAmount', () => {
      expect(() =>
        reserveGoalSchema.parse({
          reservations: [{ goalId: 'abc', reservedAmount: -1 }],
        }),
      ).toThrow();
    });
  });

  describe('updateRecommendationStatusSchema', () => {
    it('accepts dismissed', () => {
      expect(() =>
        updateRecommendationStatusSchema.parse({ status: 'dismissed' }),
      ).not.toThrow();
    });

    it('accepts accepted', () => {
      expect(() =>
        updateRecommendationStatusSchema.parse({ status: 'accepted' }),
      ).not.toThrow();
    });

    it('rejects invalid status', () => {
      expect(() =>
        updateRecommendationStatusSchema.parse({ status: 'pending' }),
      ).toThrow();
    });
  });

  describe('generateInsightsSchema', () => {
    it('requires budgetPeriodId', () => {
      expect(() => generateInsightsSchema.parse({})).toThrow();
      expect(() =>
        generateInsightsSchema.parse({ budgetPeriodId: 'abc' }),
      ).not.toThrow();
    });
  });
});
