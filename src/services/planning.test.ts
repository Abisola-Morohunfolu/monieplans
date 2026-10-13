import { describe, it, expect } from 'vitest';
import {
  BUFFER,
  localDate,
  calendarWeeks,
  splitByDays,
  summarizePlan,
  previewMove,
} from './planning';
const buckets = [
  {
    id: 'fuel',
    name: 'Fuel',
    assignedCents: 12000000,
    originalTargetCents: 12000000,
    pacing: 'monthly',
  },
  {
    id: 'food',
    name: 'Groceries',
    assignedCents: 20000000,
    originalTargetCents: 20000000,
    pacing: 'weekly',
  },
];
const allocations = (month: string) => [
  ...splitByDays(20000000, calendarWeeks(month)).map((amountCents, i) => ({
    bucketId: 'food',
    weekStart: calendarWeeks(month)[i].start,
    amountCents,
  })),
  ...splitByDays(18000000, calendarWeeks(month)).map((amountCents, i) => ({
    bucketId: BUFFER,
    weekStart: calendarWeeks(month)[i].start,
    amountCents,
  })),
];
describe('calendar weekly planning', () => {
  it('uses the configured timezone at month boundaries', () => {
    const date = new Date('2026-09-30T23:30:00Z');
    expect(localDate('Africa/Lagos', date)).toBe('2026-10-01');
    expect(localDate('America/New_York', date)).toBe('2026-09-30');
  });

  it.each(['2026-02', '2024-02', '2026-08', '2026-11', '2026-12', '2027-01'])(
    'covers every day once in %s with exact rounding',
    (m) => {
      const weeks = calendarWeeks(m),
        expected = new Date(
          Number(m.slice(0, 4)),
          Number(m.slice(5)),
          0,
        ).getDate();
      expect(weeks.reduce((s, w) => s + w.days, 0)).toBe(expected);
      expect(new Set(weeks.map((w) => w.start)).size).toBe(weeks.length);
      for (let i = 1; i < weeks.length; i++)
        expect(new Date(weeks[i].start + 'T00:00Z').getUTCDay()).toBe(1);
      for (const cents of [0, 1, 2, 31, 101, 50000001])
        expect(splitByDays(cents, weeks).reduce((s, n) => s + n, 0)).toBe(
          cents,
        );
      expect(splitByDays(3100, calendarWeeks('2026-08'))).toEqual(
        calendarWeeks('2026-08').map((w) => w.days * 100),
      );
    },
  );
  it('supports four, five, six week months and leap years', () => {
    expect(calendarWeeks('2027-02')).toHaveLength(4);
    expect(calendarWeeks('2026-10')).toHaveLength(5);
    expect(calendarWeeks('2026-08')).toHaveLength(6);
    expect(calendarWeeks('2024-02').at(-1)?.end).toBe('2024-02-29');
  });
  it('reserves fuel, carries underspending and propagates overruns; edits recalculate', () => {
    const a = allocations('2026-10'),
      expenses = [
        { categoryId: 'fuel', amountCents: 8000000, occurredOn: '2026-10-02' },
        { categoryId: 'food', amountCents: 3000000, occurredOn: '2026-10-03' },
      ];
    const s = summarizePlan(
      '2026-10',
      50000000,
      buckets,
      expenses,
      a,
      [],
      '2026-10-13',
    );
    expect(s.bufferAvailableCents).toBe(18000000);
    expect(s.flexibleRemainingCents).toBe(35000000);
    expect(s.totalExpenseCents).toBe(11000000);
    expect(
      s.weeks[1].buckets.find((b) => b.bucketId === 'food')!.carryCents,
    ).toBe(a.find((w) => w.bucketId === 'food')!.amountCents - 3000000);
    const over = summarizePlan(
      '2026-10',
      50000000,
      buckets,
      [{ ...expenses[1], amountCents: 25000000 }],
      a,
      [],
      '2026-10-13',
    );
    expect(over.categories[1].availableCents).toBe(-5000000);
    const deleted = summarizePlan(
      '2026-10',
      50000000,
      buckets,
      [],
      a,
      [],
      '2026-10-13',
    );
    expect(deleted.totalExpenseCents).toBe(0);
  });
  it('monthly-only excess and uncategorized spending consume flexible money', () => {
    const s = summarizePlan(
      '2026-10',
      50000000,
      buckets,
      [
        { categoryId: 'fuel', amountCents: 15000000, occurredOn: '2026-10-02' },
        { categoryId: null, amountCents: 2000000, occurredOn: '2026-10-03' },
      ],
      allocations('2026-10'),
      [],
      '2026-10-13',
    );
    expect(s.bufferAvailableCents).toBe(13000000);
    expect(s.flexibleRemainingCents).toBe(33000000);
  });
  it('moves only unused money, preserves original targets and total', () => {
    const a = allocations('2026-10'),
      s = summarizePlan(
        '2026-10',
        50000000,
        buckets,
        [
          {
            categoryId: 'fuel',
            amountCents: 8000000,
            occurredOn: '2026-10-02',
          },
        ],
        a,
        [],
        '2026-10-13',
      );
    const move = previewMove(s, a, 'fuel', 'food', 2000000);
    expect(move.sourceAvailableCents).toBe(2000000);
    expect(move.destinationAvailableCents).toBe(22000000);
    expect(move.adjustments).toEqual([
      { bucketId: 'food', weekStart: '2026-10-12', amountCents: 2000000 },
    ]);
    expect(() => previewMove(s, a, 'fuel', 'food', 4000001)).toThrow('unused');
    expect(() => previewMove(s, a, 'fuel', 'fuel', 1)).toThrow();
    expect(buckets[0].originalTargetCents).toBe(12000000);
  });
  it('reduces last future week first and represents carried reductions as signed adjustments', () => {
    const a = allocations('2026-10'),
      s = summarizePlan('2026-10', 50000000, buckets, [], a, [], '2026-10-26'),
      move = previewMove(s, a, 'food', BUFFER, 19000000);
    expect(
      move.allocations.filter(
        (a) => a.bucketId === 'food' && a.weekStart < '2026-10-26',
      ),
    ).toEqual(
      a.filter((a) => a.bucketId === 'food' && a.weekStart < '2026-10-26'),
    );
    expect(move.adjustments).toContainEqual({
      bucketId: 'food',
      weekStart: '2026-10-26',
      amountCents: -19000000,
    });
    expect(move.adjustments).toContainEqual({
      bucketId: BUFFER,
      weekStart: '2026-10-26',
      amountCents: 19000000,
    });
  });
});
