import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import type { Env } from '../index';
import { atomic, loadPlan, serializePlan, statement } from '../services/ledger';
import { workersAI } from '../services/ai';
import { BUFFER, calendarWeeks, splitByDays } from '../services/planning';
import { monthParamSchema } from '../shared/schemas';
import { monthRange, toCents } from '../shared/utils';
export const reviewsRouter = new Hono<{ Bindings: Env }>();
const amount = z
  .number()
  .min(0)
  .max(1e10)
  .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.0001);
export const proposalSchema = z.object({
  explanation: z.string().min(1).max(3000),
  spendingLimit: amount,
  assignments: z
    .array(
      z.object({
        categoryId: z.string(),
        assigned: amount,
        pacing: z.enum(['monthly', 'weekly']),
      }),
    )
    .max(100),
});
export async function fingerprint(data: unknown) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(JSON.stringify(data)),
      ),
    ),
  ]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');
}
function parseMonth(m: string) {
  const r = monthParamSchema.safeParse(m);
  if (!r.success) throw new HTTPException(400, { message: 'Invalid month' });
  return r.data;
}
async function review(db: D1Database, uid: string, month: string) {
  const p = await loadPlan(db, uid, month),
    summary = serializePlan(p);
  const weekly = p.summary.weeks.map((w) => ({
    start: w.start,
    end: w.end,
    spent:
      p.expenses
        .filter((e) => e.occurredOn >= w.start && e.occurredOn <= w.end)
        .reduce((s, e) => s + e.amountCents, 0) / 100,
    planned: w.plannedCents / 100,
    flexibleSpent: w.spentCents / 100,
  }));
  const monthToDate = p.today < monthRange(month).nextStart;
  const data = {
    month,
    currency: p.budget.currency,
    spendingLimit: summary.spendingLimit,
    totals: summary.totals,
    categories: summary.categories,
    movements: summary.movements,
    weekly,
    monthToDate,
    excludedCurrencyCount: p.excludedCurrencyCount,
    uncategorized:
      p.expenses
        .filter((e) => !e.categoryId)
        .reduce((sum, e) => sum + e.amountCents, 0) / 100,
  };
  return { p, data, hash: await fingerprint(data) };
}
reviewsRouter.get('/:month', async (c) => {
  const uid = c.get('user').id,
    m = parseMonth(c.req.param('month')),
    { p, data, hash } = await review(c.env.DB, uid, m);
  const rows = await statement(
    c.env.DB,
    'SELECT * FROM recommendations WHERE user_id=? AND month=? ORDER BY created_at DESC LIMIT 1',
    uid,
    m,
  ).all<{
    id: string;
    fingerprint: string;
    proposal_json: string;
    created_at: string;
    applied_at: string | null;
  }>();
  const recommendation = rows.results[0];
  return c.json({
    ...data,
    revision: p.revision,
    recommendation: recommendation
      ? {
          id: recommendation.id,
          ...JSON.parse(recommendation.proposal_json),
          stale: recommendation.fingerprint !== hash,
          createdAt: recommendation.created_at,
          appliedAt: recommendation.applied_at,
        }
      : null,
    aiAvailable: !!c.env.AI,
  });
});
reviewsRouter.post('/:month/generate', async (c) => {
  if (!c.env.AI)
    throw new HTTPException(503, {
      message:
        'AI reviews are not configured. Your monthly breakdown is still available.',
    });
  const uid = c.get('user').id,
    m = parseMonth(c.req.param('month')),
    { data, hash } = await review(c.env.DB, uid, m);
  if (data.spendingLimit === null)
    throw new HTTPException(400, {
      message: 'Confirm a monthly spending limit first.',
    });
  let proposal: z.infer<typeof proposalSchema>;
  try {
    proposal = proposalSchema.parse(await workersAI(c.env.AI).recommend(data));
  } catch {
    throw new HTTPException(502, {
      message: 'Could not generate a readable proposal. Try again.',
    });
  }
  if (
    proposal.spendingLimit !== data.spendingLimit ||
    new Set(proposal.assignments.map((a) => a.categoryId)).size !==
      proposal.assignments.length ||
    proposal.assignments.some(
      (a) => !data.categories.some((b) => b.id === a.categoryId),
    ) ||
    proposal.assignments.reduce((s, a) => s + toCents(a.assigned), 0) >
      toCents(proposal.spendingLimit)
  )
    throw new HTTPException(502, {
      message: 'AI returned an invalid allocation. Try again.',
    });
  const id = crypto.randomUUID();
  await statement(
    c.env.DB,
    'INSERT INTO recommendations(id,user_id,month,fingerprint,summary_json,proposal_json,created_at) VALUES(?,?,?,?,?,?,?)',
    id,
    uid,
    m,
    hash,
    JSON.stringify(data),
    JSON.stringify(proposal),
    new Date().toISOString(),
  ).run();
  return c.json({ id, ...proposal });
});
async function prepare(db: D1Database, uid: string, m: string, id: string) {
  const source = await review(db, uid, m);
  const row = await statement(
    db,
    'SELECT * FROM recommendations WHERE id=? AND user_id=? AND month=?',
    id,
    uid,
    m,
  ).first<{
    fingerprint: string;
    proposal_json: string;
    applied_at: string | null;
  }>();
  if (!row)
    throw new HTTPException(404, { message: 'Recommendation not found' });
  if (row.fingerprint !== source.hash)
    throw new HTTPException(409, {
      message: 'This recommendation is stale. Generate a new one.',
    });
  const targetMonth = monthRange(m).nextStart.slice(0, 7);
  if (targetMonth <= source.p.today.slice(0, 7))
    throw new HTTPException(400, {
      message:
        'Generate a review for the current month to plan a future month.',
    });
  let target: Awaited<ReturnType<typeof loadPlan>> | null = null;
  try {
    target = await loadPlan(db, uid, targetMonth);
  } catch (e) {
    if (!(e instanceof HTTPException && e.status === 404)) throw e;
  }
  if (target && target.revision !== source.p.revision)
    throw new HTTPException(409, {
      message: 'The plan changed. Refresh the preview.',
    });
  if (target && target.budget.currency !== source.data.currency)
    throw new HTTPException(400, {
      message: `This recommendation uses ${source.data.currency}, but your ${targetMonth} plan uses ${target.budget.currency}. Set next month's allocations manually in Plan.`,
    });
  const proposal = proposalSchema.parse(JSON.parse(row.proposal_json));
  const proposed = source.p.buckets.map((b) => ({
    categoryId: b.id,
    assigned:
      proposal.assignments.find((a) => a.categoryId === b.id)?.assigned ?? 0,
    pacing:
      proposal.assignments.find((a) => a.categoryId === b.id)?.pacing ??
      'monthly',
  }));
  return { source, row, target, targetMonth, proposal, proposed };
}
reviewsRouter.post('/:month/proposals/:id/preview', async (c) => {
  const p = await prepare(
    c.env.DB,
    c.get('user').id,
    parseMonth(c.req.param('month')),
    c.req.param('id'),
  );
  return c.json({
    month: p.targetMonth,
    revision: p.source.p.revision,
    existing: p.target ? serializePlan(p.target) : null,
    spendingLimit: p.proposal.spendingLimit,
    assignments: p.proposed,
    applied: !!p.row.applied_at,
  });
});
reviewsRouter.post('/:month/proposals/:id/apply', async (c) => {
  const uid = c.get('user').id,
    db = c.env.DB,
    m = parseMonth(c.req.param('month')),
    id = c.req.param('id');
  const input = z
    .object({ revision: z.number().int().min(0) })
    .safeParse(await c.req.json());
  if (!input.success)
    throw new HTTPException(400, { message: 'Preview this proposal first.' });
  const p = await prepare(db, uid, m, id);
  if (p.row.applied_at) return c.json({ ok: true, month: p.targetMonth });
  const budgetId = p.target?.budget.id ?? crypto.randomUUID(),
    queries: D1PreparedStatement[] = [];
  if (p.target)
    queries.push(
      statement(
        db,
        'UPDATE budgets SET spending_limit_cents=?,updated_at=? WHERE id=?',
        toCents(p.proposal.spendingLimit),
        new Date().toISOString(),
        budgetId,
      ),
    );
  else
    queries.push(
      statement(
        db,
        "INSERT INTO budgets(id,user_id,month,currency,status,spending_limit_cents) VALUES(?,?,?,?,'active',?)",
        budgetId,
        uid,
        p.targetMonth,
        p.source.data.currency,
        toCents(p.proposal.spendingLimit),
      ),
    );
  // Future-month proposals preserve recorded original targets, while replacing the editable pacing plan.
  queries.push(
    statement(db, 'DELETE FROM weekly_allocations WHERE budget_id=?', budgetId),
  );
  // No completed weeks exist in the future target month. Keep movement records and
  // their signed adjustments; compensate the old pacing adjustments explicitly
  // before installing the reviewed replacement schedule.
  const netAdjustments = new Map<string, number>();
  for (const adjustment of p.target?.adjustments ?? [])
    netAdjustments.set(
      adjustment.bucketId,
      (netAdjustments.get(adjustment.bucketId) ?? 0) + adjustment.amountCents,
    );
  for (const [bucketId, cents] of netAdjustments) {
    if (cents)
      queries.push(
        statement(
          db,
          'INSERT INTO weekly_adjustments(id,budget_id,bucket_id,week_start,amount_cents,movement_id) VALUES(?,?,?,?,?,?)',
          crypto.randomUUID(),
          budgetId,
          bucketId,
          calendarWeeks(p.targetMonth)[0].start,
          -cents,
          `proposal:${id}`,
        ),
      );
  }
  for (const a of p.proposed) {
    queries.push(
      statement(
        db,
        `INSERT INTO category_budgets(id,budget_id,category_id,assigned_cents,original_target_cents,pacing) VALUES(?,?,?,?,?,?) ON CONFLICT(budget_id,category_id) DO UPDATE SET assigned_cents=excluded.assigned_cents,pacing=excluded.pacing,updated_at=CURRENT_TIMESTAMP`,
        crypto.randomUUID(),
        budgetId,
        a.categoryId,
        toCents(a.assigned),
        toCents(a.assigned),
        a.pacing,
      ),
    );
  }
  const weeks = calendarWeeks(p.targetMonth),
    buffer =
      toCents(p.proposal.spendingLimit) -
      p.proposed.reduce((s, a) => s + toCents(a.assigned), 0);
  for (const a of [
    ...p.proposed
      .filter((a) => a.pacing === 'weekly')
      .map((a) => ({ id: a.categoryId, cents: toCents(a.assigned) })),
    { id: BUFFER, cents: buffer },
  ])
    splitByDays(a.cents, weeks).forEach((n, i) =>
      queries.push(
        statement(
          db,
          'INSERT INTO weekly_allocations(id,budget_id,bucket_id,week_start,amount_cents) VALUES(?,?,?,?,?)',
          crypto.randomUUID(),
          budgetId,
          a.id,
          weeks[i].start,
          n,
        ),
      ),
    );
  queries.push(
    statement(
      db,
      'UPDATE recommendations SET applied_at=? WHERE id=?',
      new Date().toISOString(),
      id,
    ),
  );
  await atomic(db, uid, input.data.revision, queries);
  return c.json({ ok: true, month: p.targetMonth });
});
