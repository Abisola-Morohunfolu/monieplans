import { fromCents } from './utils';

export interface BudgetRow {
  id: string;
  presetMonth: string | null;
  periodStartDate: string;
  periodEndDate: string;
  cycleType: string;
  status: string;
  planningMode: string;
  monthlyIncomeAmountCents: number | null;
  monthlyBudgetCapAmountCents: number | null;
  currency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

function budgetName(
  presetMonth: string | null,
  periodStartDate: string,
): string {
  if (presetMonth) {
    const [year, month] = presetMonth.split('-').map(Number);
    if (year && month) {
      return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(
        'en-US',
        { month: 'long', year: 'numeric', timeZone: 'UTC' },
      );
    }
    return presetMonth;
  }
  return periodStartDate;
}

export function serializeBudget(p: BudgetRow) {
  return {
    id: p.id,
    name: budgetName(p.presetMonth, p.periodStartDate),
    status: p.status,
    cycle: 'weekly' as const,
    cycleType: p.cycleType,
    periodStartDate: p.periodStartDate,
    periodEndDate: p.periodEndDate,
    presetMonth: p.presetMonth,
    cap: fromCents(p.monthlyBudgetCapAmountCents ?? 0),
    income: fromCents(p.monthlyIncomeAmountCents ?? 0),
    planningMode: p.planningMode,
    currency: p.currency,
    notes: p.notes,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function serializeExpense<
  T extends { amountCents: number; expenseDate: string },
>(e: T) {
  const { amountCents, ...rest } = e;
  return {
    ...rest,
    amount: fromCents(amountCents),
    date: e.expenseDate,
  };
}

export interface GoalRow {
  id: string;
  name: string;
  targetAmountCents: number;
  currentSavedAmountCents: number;
  targetDate: string | null;
  status: string;
  priorityRank: number;
  reserveInBudget: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export function serializeTransaction<
  T extends { amountCents: number; postedDate: string },
>(t: T) {
  const { amountCents, ...rest } = t;
  return {
    ...rest,
    amount: fromCents(amountCents),
    date: t.postedDate,
  };
}

export function serializeGoal(g: GoalRow) {
  return {
    id: g.id,
    name: g.name,
    targetAmount: fromCents(g.targetAmountCents),
    currentAmount: fromCents(g.currentSavedAmountCents),
    deadline: g.targetDate,
    status: g.status,
    priorityRank: g.priorityRank,
    reserveInBudget: g.reserveInBudget,
    notes: g.notes,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
}

export function serializeIncome<
  T extends { amountCents: number; incomeDate: string },
>(i: T) {
  const { amountCents, ...rest } = i;
  return {
    ...rest,
    amount: fromCents(amountCents),
    date: i.incomeDate,
  };
}

export function serializeAllocation<
  T extends {
    plannedAmountCents: number;
    finalPlannedAmountCents: number;
    actualSpentAmountCentsCache: number | null;
    remainingAmountCentsCache: number | null;
  },
>(a: T) {
  const {
    plannedAmountCents,
    finalPlannedAmountCents,
    actualSpentAmountCentsCache,
    remainingAmountCentsCache,
    ...rest
  } = a;
  return {
    ...rest,
    plannedAmount: fromCents(plannedAmountCents),
    finalPlannedAmount: fromCents(finalPlannedAmountCents),
    actualSpent: fromCents(actualSpentAmountCentsCache ?? 0),
    remaining: fromCents(remainingAmountCentsCache ?? 0),
  };
}

export interface FixedExpenseTemplateRow {
  id: string;
  name: string;
  amountCents: number;
  categoryId: string | null;
  categoryName?: string | null;
  cadence: string;
  defaultDueDay: number | null;
  createdAt: string;
  updatedAt: string;
}

export function serializeFixedExpenseTemplate(t: FixedExpenseTemplateRow) {
  return {
    id: t.id,
    name: t.name,
    amount: fromCents(t.amountCents),
    categoryId: t.categoryId,
    categoryName: t.categoryName ?? null,
    frequency: t.cadence,
    dueDay: t.defaultDueDay,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}
