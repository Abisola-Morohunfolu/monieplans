import { monthRange } from '../shared/utils';

export const BUFFER = '__buffer__';
export interface Week {
  start: string;
  end: string;
  days: number;
}
export interface Allocation {
  bucketId: string;
  weekStart: string;
  amountCents: number;
}
export interface Adjustment extends Allocation {
  movementId?: string;
}
export interface Bucket {
  id: string;
  name: string;
  assignedCents: number;
  originalTargetCents: number;
  pacing: string;
}
export interface Expense {
  categoryId: string | null;
  amountCents: number;
  occurredOn: string;
}
export function localDate(timezone = 'Africa/Lagos', date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
export function calendarWeeks(month: string): Week[] {
  const { start, nextStart } = monthRange(month);
  const weeks: Week[] = [];
  let date = new Date(start + 'T00:00:00Z');
  const next = new Date(nextStart + 'T00:00:00Z');
  while (date < next) {
    const first = date.toISOString().slice(0, 10);
    let days = 0;
    do {
      days++;
      date = new Date(date.getTime() + 86400000);
    } while (date < next && date.getUTCDay() !== 1);
    weeks.push({
      start: first,
      end: new Date(date.getTime() - 86400000).toISOString().slice(0, 10),
      days,
    });
  }
  return weeks;
}
export function splitByDays(cents: number, weeks: Week[]): number[] {
  const days = weeks.reduce((sum, w) => sum + w.days, 0);
  // Cumulative rounding guarantees exact cents and keeps partial weeks proportional.
  let passed = 0;
  return weeks.map((w) => {
    const before = Math.round((cents * passed) / days);
    passed += w.days;
    return Math.round((cents * passed) / days) - before;
  });
}
export function summarizePlan(
  month: string,
  limit: number | null,
  buckets: Bucket[],
  expenses: Expense[],
  allocations: Allocation[],
  adjustments: Adjustment[],
  today: string,
) {
  const weeks = calendarWeeks(month);
  const currentIndex =
    today < weeks[0].start
      ? 0
      : Math.max(
          0,
          weeks.findIndex((w) => today <= w.end),
        );
  const index = today > weeks.at(-1)!.end ? weeks.length - 1 : currentIndex;
  const totalAssigned = buckets.reduce((s, b) => s + b.assignedCents, 0);
  const buffer = (limit ?? totalAssigned) - totalAssigned;
  const categoryRows = buckets.map((b) => {
    const spent = expenses
      .filter((e) => e.categoryId === b.id)
      .reduce((s, e) => s + e.amountCents, 0);
    return {
      ...b,
      spentCents: spent,
      availableCents: b.assignedCents - spent,
      warning:
        spent > b.assignedCents
          ? 'exceeded'
          : spent === b.assignedCents && spent > 0
            ? 'reached'
            : spent >= b.assignedCents * 0.8 && spent > 0
              ? '80%'
              : null,
    };
  });
  const weeklyIds = new Set(
    buckets.filter((b) => b.pacing === 'weekly').map((b) => b.id),
  );
  const monthlyIds = new Set(
    buckets.filter((b) => b.pacing !== 'weekly').map((b) => b.id),
  );
  const knownIds = new Set(buckets.map((b) => b.id));
  // Reserved purchases only enter the flexible ledger once they exceed the current cap.
  const running = new Map<string, number>();
  const flexible = [...expenses]
    .sort((a, b) => a.occurredOn.localeCompare(b.occurredOn))
    .map((e) => {
      if (e.categoryId && monthlyIds.has(e.categoryId)) {
        const cap = buckets.find((b) => b.id === e.categoryId)!.assignedCents;
        const before = running.get(e.categoryId) ?? 0;
        running.set(e.categoryId, before + e.amountCents);
        return {
          ...e,
          amountCents:
            Math.max(0, before + e.amountCents - cap) -
            Math.max(0, before - cap),
        };
      }
      return e;
    });
  const unbucketed = flexible.filter(
    (e) =>
      !e.categoryId ||
      !knownIds.has(e.categoryId) ||
      monthlyIds.has(e.categoryId),
  );
  const bufferSpent = unbucketed.reduce((s, e) => s + e.amountCents, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amountCents, 0);
  const monthlyRemaining = (limit ?? 0) - totalExpense;
  const flexibleRemaining =
    buffer +
    buckets
      .filter((b) => weeklyIds.has(b.id))
      .reduce((s, b) => s + b.assignedCents, 0) -
    flexible.reduce((s, e) => s + e.amountCents, 0);
  const weekRows = weeks.map((w, i) => {
    const bucketRows = [
      ...buckets.filter((b) => weeklyIds.has(b.id)),
      { id: BUFFER, assignedCents: buffer },
    ].map((b) => {
      const planned = allocations
        .filter((a) => a.bucketId === b.id && a.weekStart === w.start)
        .reduce((s, a) => s + a.amountCents, 0);
      const adjusted = adjustments
        .filter((a) => a.bucketId === b.id && a.weekStart === w.start)
        .reduce((s, a) => s + a.amountCents, 0);
      const ledger =
        b.id === BUFFER
          ? unbucketed
          : expenses.filter((e) => e.categoryId === b.id);
      const spent = ledger
        .filter((e) => e.occurredOn >= w.start && e.occurredOn <= w.end)
        .reduce((s, e) => s + e.amountCents, 0);
      const cumulativeAllocated =
        allocations
          .filter((a) => a.bucketId === b.id && a.weekStart <= w.start)
          .reduce((s, a) => s + a.amountCents, 0) +
        adjustments
          .filter((a) => a.bucketId === b.id && a.weekStart <= w.start)
          .reduce((s, a) => s + a.amountCents, 0);
      const cumulativeSpent = ledger
        .filter((e) => e.occurredOn <= w.end)
        .reduce((s, e) => s + e.amountCents, 0);
      return {
        bucketId: b.id,
        plannedCents: planned,
        adjustmentCents: adjusted,
        spentCents: spent,
        carryCents:
          cumulativeAllocated - planned - adjusted - (cumulativeSpent - spent),
        availableCents: cumulativeAllocated - cumulativeSpent,
      };
    });
    return {
      ...w,
      current: i === index,
      buckets: bucketRows,
      plannedCents: bucketRows.reduce(
        (s, b) => s + b.plannedCents + b.adjustmentCents,
        0,
      ),
      spentCents: bucketRows.reduce((s, b) => s + b.spentCents, 0),
      availableCents: bucketRows.reduce((s, b) => s + b.availableCents, 0),
    };
  });
  return {
    categories: categoryRows,
    weeks: weekRows,
    currentWeek: weekRows[index],
    bufferCents: buffer,
    bufferAvailableCents: buffer - bufferSpent,
    totalAssignedCents: totalAssigned,
    totalExpenseCents: totalExpense,
    monthlyRemainingCents: monthlyRemaining,
    flexibleRemainingCents: flexibleRemaining,
    weeklyAvailableCents:
      limit === null
        ? null
        : Math.min(
            weekRows[index].availableCents,
            flexibleRemaining,
            monthlyRemaining,
          ),
  };
}
export function previewMove(
  summary: ReturnType<typeof summarizePlan>,
  allocations: Allocation[],
  sourceId: string,
  destinationId: string,
  cents: number,
) {
  if (sourceId === destinationId || !Number.isSafeInteger(cents) || cents <= 0)
    throw new Error('Choose different buckets and a positive amount.');
  const source = summary.categories.find((b) => b.id === sourceId);
  const destination = summary.categories.find((b) => b.id === destinationId);
  if (
    (!source && sourceId !== BUFFER) ||
    (!destination && destinationId !== BUFFER)
  )
    throw new Error('Bucket not found.');
  const available = source?.availableCents ?? summary.bufferAvailableCents;
  if (cents > Math.min(available, summary.monthlyRemainingCents))
    throw new Error('Only unused allocation can be moved.');
  const current = summary.currentWeek.start;
  const updated = allocations.map((a) => ({ ...a }));
  const adjustments: Adjustment[] = [];
  if (!source || source.pacing === 'weekly') {
    let remaining = cents;
    for (const a of updated
      .filter((a) => a.bucketId === sourceId && a.weekStart > current)
      .sort((a, b) => b.weekStart.localeCompare(a.weekStart))) {
      const take = Math.min(remaining, a.amountCents);
      a.amountCents -= take;
      remaining -= take;
    }
    if (remaining)
      adjustments.push({
        bucketId: sourceId,
        weekStart: current,
        amountCents: -remaining,
      });
  }
  if (!destination || destination.pacing === 'weekly')
    adjustments.push({
      bucketId: destinationId,
      weekStart: current,
      amountCents: cents,
    });
  return {
    allocations: updated,
    adjustments,
    sourceAvailableCents: available - cents,
    destinationAvailableCents:
      (destination?.availableCents ?? summary.bufferAvailableCents) + cents,
  };
}
