import { Hono, type Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import type { Env } from '../index';
import { monthParamSchema } from '../shared/schemas';
import { toCents } from '../shared/utils';
import { atomic, loadPlan, serializePlan, statement } from '../services/ledger';
import {
  BUFFER,
  calendarWeeks,
  previewMove,
  splitByDays,
  summarizePlan,
} from '../services/planning';
import { assertCategoryVisible, getPreferredCurrency } from './helpers';
export const budgetsRouter = new Hono<{ Bindings: Env }>();
const money = z
  .number()
  .min(0)
  .max(1e10)
  .refine(
    (n) =>
      Number.isSafeInteger(Math.round(n * 100)) &&
      Math.abs(n * 100 - Math.round(n * 100)) < 0.0001,
    'Use at most two decimal places',
  );
const planSchema = z.object({
  spendingLimit: money,
  revision: z.number().int().min(0),
  assignments: z
    .array(
      z.object({
        categoryId: z.string().min(1),
        assigned: money,
        pacing: z.enum(['monthly', 'weekly']).default('monthly'),
        weeks: z
          .array(z.object({ weekStart: z.string().date(), amount: money }))
          .optional(),
      }),
    )
    .max(100),
});
const moveSchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string(),
  destinationId: z.string(),
  amount: money.refine((n) => n > 0),
  revision: z.number().int().min(0),
});
function month(value: string) {
  const result = monthParamSchema.safeParse(value);
  if (!result.success)
    throw new HTTPException(400, { message: 'Month must be YYYY-MM' });
  return result.data;
}
async function parse<T>(
  request: { json: () => Promise<unknown> },
  schema: z.ZodType<T>,
): Promise<T> {
  const result = schema.safeParse(await request.json());
  if (!result.success)
    throw new HTTPException(400, {
      message: result.error.issues.map((i) => i.message).join('; '),
    });
  return result.data;
}
budgetsRouter.put('/:month', async (c) => {
  const m = month(c.req.param('month')!),
    uid = c.get('user').id;
  const currency = await getPreferredCurrency(c.get('db'), uid);
  await statement(
    c.env.DB,
    "INSERT INTO budgets(id,user_id,month,currency,status) VALUES(?,?,?,?,'active') ON CONFLICT(user_id,month) DO NOTHING",
    crypto.randomUUID(),
    uid,
    m,
    currency,
  ).run();
  return c.json(serializePlan(await loadPlan(c.env.DB, uid, m)));
});
budgetsRouter.get('/:month', async (c) => {
  const p = await loadPlan(
    c.env.DB,
    c.get('user').id,
    month(c.req.param('month')!),
  );
  return c.json({
    ...serializePlan(p),
    assignments: p.buckets.map((b) => ({
      categoryId: b.id,
      assigned: b.assignedCents / 100,
      pacing: b.pacing,
      originalTarget: b.originalTargetCents / 100,
    })),
  });
});
budgetsRouter.get('/:month/summary', async (c) =>
  c.json(
    serializePlan(
      await loadPlan(c.env.DB, c.get('user').id, month(c.req.param('month')!)),
    ),
  ),
);
budgetsRouter.put('/:month/assignments', async (c) => {
  const body = await parse(c.req, planSchema),
    uid = c.get('user').id,
    m = month(c.req.param('month')!);
  const p = await loadPlan(c.env.DB, uid, m),
    db = c.env.DB;
  if (
    new Set(body.assignments.map((a) => a.categoryId)).size !==
    body.assignments.length
  )
    throw new HTTPException(400, {
      message: 'Each bucket can appear only once.',
    });
  const assigned = new Map(p.buckets.map((b) => [b.id, b.assignedCents]));
  for (const a of body.assignments) {
    await assertCategoryVisible(c.get('db'), uid, a.categoryId);
    if (!p.buckets.some((b) => b.id === a.categoryId))
      throw new HTTPException(400, { message: 'Choose an expense category.' });
    assigned.set(a.categoryId, toCents(a.assigned));
  }
  const limit = toCents(body.spendingLimit),
    total = [...assigned.values()].reduce((s, n) => s + n, 0);
  if (total > limit)
    throw new HTTPException(400, {
      message: 'Allocations cannot exceed the monthly spending limit.',
    });
  const queries: D1PreparedStatement[] = [
    statement(
      db,
      'UPDATE budgets SET spending_limit_cents=?,updated_at=? WHERE id=?',
      limit,
      new Date().toISOString(),
      p.budget.id,
    ),
  ];
  const weeks = calendarWeeks(m),
    current = p.summary.currentWeek.start;
  const schedule = (
    id: string,
    cents: number,
    custom?: { weekStart: string; amount: number }[],
  ) => {
    const existing = p.allocations.filter((a) => a.bucketId === id);
    const adjustments = p.adjustments
      .filter((a) => a.bucketId === id)
      .reduce((s, a) => s + a.amountCents, 0);
    if (
      !custom &&
      existing.length === weeks.length &&
      existing.reduce((s, a) => s + a.amountCents, 0) + adjustments === cents
    )
      return;
    const past = existing.filter((a) => a.weekStart < current);
    const remaining =
      cents - past.reduce((s, a) => s + a.amountCents, 0) - adjustments;
    if (remaining < 0)
      throw new HTTPException(400, {
        message:
          'This allocation is below the completed weekly plan. Move unused money instead.',
      });
    if (custom) {
      if (
        custom.length !== weeks.length ||
        new Set(custom.map((w) => w.weekStart)).size !== weeks.length ||
        custom.some((w) => !weeks.some((v) => v.start === w.weekStart)) ||
        custom.reduce((s, w) => s + toCents(w.amount), 0) + adjustments !==
          cents
      )
        throw new HTTPException(400, {
          message:
            'Weekly amounts and adjustments must total the bucket allocation.',
        });
      if (
        past.some(
          (a) =>
            toCents(custom.find((w) => w.weekStart === a.weekStart)!.amount) !==
            a.amountCents,
        )
      )
        throw new HTTPException(400, {
          message: 'Completed weeks cannot be rewritten.',
        });
    }
    const future = existing.length
        ? weeks.filter((w) => w.start >= current)
        : weeks,
      values = splitByDays(remaining, future);
    queries.push(
      statement(
        db,
        'DELETE FROM weekly_allocations WHERE budget_id=? AND bucket_id=? AND week_start>=?',
        p.budget.id,
        id,
        current,
      ),
    );
    for (let i = 0; i < future.length; i++)
      queries.push(
        statement(
          db,
          'INSERT INTO weekly_allocations(id,budget_id,bucket_id,week_start,amount_cents) VALUES(?,?,?,?,?)',
          crypto.randomUUID(),
          p.budget.id,
          id,
          future[i].start,
          custom
            ? toCents(
                custom.find((w) => w.weekStart === future[i].start)!.amount,
              )
            : values[i],
        ),
      );
  };
  for (const a of body.assignments) {
    const old = p.buckets.find((b) => b.id === a.categoryId)!;
    if (
      old.pacing !== a.pacing &&
      p.adjustments.some((w) => w.bucketId === a.categoryId)
    )
      throw new HTTPException(400, {
        message:
          'A bucket with weekly movements must keep its pacing this month.',
      });
    if (
      old.pacing === 'weekly' &&
      a.pacing === 'monthly' &&
      p.allocations.some(
        (w) => w.bucketId === a.categoryId && w.weekStart < current,
      )
    )
      throw new HTTPException(400, {
        message: 'Keep weekly pacing to preserve completed weeks.',
      });
    queries.push(
      statement(
        db,
        `INSERT INTO category_budgets(id,budget_id,category_id,assigned_cents,original_target_cents,pacing) VALUES(?,?,?,?,?,?) ON CONFLICT(budget_id,category_id) DO UPDATE SET assigned_cents=excluded.assigned_cents,pacing=excluded.pacing,updated_at=CURRENT_TIMESTAMP`,
        crypto.randomUUID(),
        p.budget.id,
        a.categoryId,
        toCents(a.assigned),
        toCents(a.assigned),
        a.pacing,
      ),
    );
    if (a.pacing === 'weekly')
      schedule(a.categoryId, toCents(a.assigned), a.weeks);
    else
      queries.push(
        statement(
          db,
          'DELETE FROM weekly_allocations WHERE budget_id=? AND bucket_id=?',
          p.budget.id,
          a.categoryId,
        ),
      );
  }
  schedule(BUFFER, limit - total);
  await atomic(db, uid, body.revision, queries);
  return c.json(serializePlan(await loadPlan(db, uid, m)));
});
async function movement(c: Context<{ Bindings: Env }>, save: boolean) {
  const body = await parse(c.req, moveSchema),
    uid = c.get('user').id,
    m = month(c.req.param('month')!);
  const p = await loadPlan(c.env.DB, uid, m),
    db = c.env.DB;
  const existing = p.movements.find(
    (v) => (v as Record<string, unknown>).id === body.id,
  );
  if (existing) return c.json({ ok: true, id: body.id });
  if (p.budget.spending_limit_cents === null)
    throw new HTTPException(400, {
      message: 'Confirm your monthly limit first.',
    });
  if (body.revision !== p.revision)
    throw new HTTPException(409, {
      message: 'Plan changed. Refresh the preview.',
    });
  let preview: ReturnType<typeof previewMove>;
  try {
    preview = previewMove(
      p.summary,
      p.allocations,
      body.sourceId,
      body.destinationId,
      toCents(body.amount),
    );
  } catch (e) {
    throw new HTTPException(400, { message: (e as Error).message });
  }
  const revised = p.buckets.map((b) => ({
    ...b,
    assignedCents:
      b.assignedCents +
      (b.id === body.sourceId
        ? -toCents(body.amount)
        : b.id === body.destinationId
          ? toCents(body.amount)
          : 0),
  }));
  const newSummary = summarizePlan(
    m,
    p.budget.spending_limit_cents,
    revised,
    p.expenses,
    preview.allocations,
    [...p.adjustments, ...preview.adjustments],
    p.today,
  );
  if (!save)
    return c.json({
      ...preview,
      weeks: newSummary.weeks,
      monthlyRemaining: newSummary.monthlyRemainingCents / 100,
    });
  const queries = [
    statement(
      db,
      'INSERT INTO budget_movements(id,budget_id,source_id,destination_id,amount_cents,occurred_on,created_at) VALUES(?,?,?,?,?,?,?)',
      body.id,
      p.budget.id,
      body.sourceId,
      body.destinationId,
      toCents(body.amount),
      p.today,
      new Date().toISOString(),
    ),
  ];
  for (const b of revised.filter(
    (b) => b.id === body.sourceId || b.id === body.destinationId,
  ))
    queries.push(
      statement(
        db,
        `INSERT INTO category_budgets(id,budget_id,category_id,assigned_cents,original_target_cents,pacing) VALUES(?,?,?,?,?,?) ON CONFLICT(budget_id,category_id) DO UPDATE SET assigned_cents=excluded.assigned_cents,updated_at=CURRENT_TIMESTAMP`,
        crypto.randomUUID(),
        p.budget.id,
        b.id,
        b.assignedCents,
        b.originalTargetCents,
        b.pacing,
      ),
    );
  for (const a of preview.allocations.filter((a) =>
    p.allocations.some(
      (old) =>
        old.bucketId === a.bucketId &&
        old.weekStart === a.weekStart &&
        old.amountCents !== a.amountCents,
    ),
  ))
    queries.push(
      statement(
        db,
        'UPDATE weekly_allocations SET amount_cents=? WHERE budget_id=? AND bucket_id=? AND week_start=?',
        a.amountCents,
        p.budget.id,
        a.bucketId,
        a.weekStart,
      ),
    );
  for (const a of preview.adjustments)
    queries.push(
      statement(
        db,
        'INSERT INTO weekly_adjustments(id,budget_id,bucket_id,week_start,amount_cents,movement_id) VALUES(?,?,?,?,?,?)',
        crypto.randomUUID(),
        p.budget.id,
        a.bucketId,
        a.weekStart,
        a.amountCents,
        body.id,
      ),
    );
  await atomic(db, uid, p.revision, queries);
  return c.json({ ok: true, id: body.id });
}
budgetsRouter.post('/:month/moves/preview', (c) => movement(c, false));
budgetsRouter.post('/:month/moves', (c) => movement(c, true));
