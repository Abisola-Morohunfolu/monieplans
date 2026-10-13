import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { drizzle } from 'drizzle-orm/d1';
import { testD1 } from '../testing/d1';
import * as schema from '../database/schema';
import { budgetsRouter } from './budgets';
import { transactionsRouter } from './transactions';
import { capturesRouter } from './captures';
import { reviewsRouter } from './reviews';
import { processCapture, captureQueue } from '../services/capture';
import { statement } from '../services/ledger';
import type { Env } from '../index';
const uid = 'alice',
  month = '2026-10',
  date = '2026-10-02';
let fixture: ReturnType<typeof testD1>, env: Env, app: Hono<{ Bindings: Env }>;
const extraction = {
  amount: 80000,
  occurredOn: date,
  payee: 'Fuel Station',
  currency: 'NGN',
  paymentStatus: 'completed',
  type: 'expense',
  suggestedCategoryId: 'food',
  confidence: 'high',
  warnings: [],
};
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-13T12:00:00Z'));
  fixture = testD1();
  fixture.sqlite.exec(
    `INSERT INTO user(id,name,email,created_at,updated_at) VALUES('alice','Alice','alice@example.test',0,0),('bob','Bob','bob@example.test',0,0); INSERT INTO user_profiles(id,user_id) VALUES('profile','alice'); INSERT INTO categories(id,code,name) VALUES('fuel','FUEL','Fuel'),('food','FOOD','Groceries');`,
  );
  env = {
    DB: fixture.db,
    BETTER_AUTH_SECRET: 'test',
    AI: {
      run: vi.fn().mockResolvedValue({ response: JSON.stringify(extraction) }),
    } as unknown as Ai,
    CAPTURE_QUEUE: {
      send: vi.fn().mockResolvedValue(undefined),
    } as unknown as Queue,
    RECEIPTS: {
      put: vi.fn(),
      get: vi.fn().mockResolvedValue({
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
        body: new Uint8Array([1, 2, 3]),
      }),
    } as unknown as R2Bucket,
  };
  app = new Hono<{ Bindings: Env }>();
  app.use('*', async (c, next) => {
    c.set('user', {
      id: uid,
      name: 'Alice',
      email: 'alice@example.test',
      emailVerified: true,
    });
    c.set('db', drizzle(c.env.DB, { schema }));
    await next();
  });
  app.route('/budgets', budgetsRouter);
  app.route('/transactions', transactionsRouter);
  app.route('/captures', capturesRouter);
  app.route('/reviews', reviewsRouter);
  app.onError((e, c) =>
    c.json({ error: e.message }, e instanceof HTTPException ? e.status : 500),
  );
});
afterEach(() => {
  fixture.sqlite.close();
  vi.useRealTimers();
});
const req = (path: string, body?: unknown, method = body ? 'POST' : 'GET') =>
  app.request(
    path,
    {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    },
    env,
  );
async function plan() {
  await req(`/budgets/${month}`, {}, 'PUT');
  const s = (await (await req(`/budgets/${month}/summary`)).json()) as {
    revision: number;
  };
  const response = await req(
    `/budgets/${month}/assignments`,
    {
      spendingLimit: 500000,
      revision: s.revision,
      assignments: [
        { categoryId: 'fuel', assigned: 120000, pacing: 'monthly' },
        { categoryId: 'food', assigned: 200000, pacing: 'weekly' },
      ],
    },
    'PUT',
  );
  expect(response.status).toBe(200);
  return response.json() as Promise<{
    revision: number;
    spendingLimit: number;
    categories: {
      id: string;
      assigned: number;
      originalTarget: number;
      activity: number;
      available: number;
    }[];
    totals: { totalExpense: number; remaining: number };
  }>;
}
async function capture(status = 'completed') {
  const id = crypto.randomUUID();
  await statement(
    env.DB,
    "INSERT INTO captures(id,user_id,object_key,sha256,mime_type,size_bytes,status,default_category_id,opened_month,extracted_json,created_at,updated_at) VALUES(?,?,?,?,?,1,'ready','fuel','2026-09',?,?,?)",
    id,
    uid,
    id,
    id,
    'image/png',
    JSON.stringify({ ...extraction, paymentStatus: status }),
    new Date().toISOString(),
    new Date().toISOString(),
  ).run();
  return id;
}
describe('ledger API integration with SQLite', () => {
  it('keeps the plan currency when preferences change and never sums foreign currencies', async () => {
    await plan();
    fixture.sqlite.exec(
      "UPDATE user_profiles SET preferred_currency='USD' WHERE user_id='alice'",
    );
    const saved = await req('/transactions', {
      type: 'expense',
      amount: 10,
      occurredOn: date,
    });
    expect(saved.status).toBe(201);
    const tx = (await saved.json()) as { id: string; currency: string };
    expect(tx.currency).toBe('NGN');
    expect(
      (await req('/transactions/' + tx.id, { currency: 'USD' }, 'PATCH'))
        .status,
    ).toBe(200);
    const s = (await (await req('/budgets/' + month + '/summary')).json()) as {
      totals: { totalExpense: number };
      excludedCurrencyCount: number;
    };
    expect(s.totals.totalExpense).toBe(0);
    expect(s.excludedCurrencyCount).toBe(1);
  });

  it('keeps account cascades valid after installing revision triggers', async () => {
    await plan();
    await req('/transactions', {
      type: 'expense',
      amount: 1,
      occurredOn: date,
    });
    fixture.sqlite.prepare('DELETE FROM user WHERE id=?').run(uid);
    expect(
      fixture.sqlite.prepare('SELECT count(*) n FROM ledger_versions').get()?.n,
    ).toBe(0);
  });

  it('preserves legacy caps and requires explicit limit confirmation', async () => {
    fixture.sqlite.exec(
      "INSERT INTO budgets(id,user_id,month) VALUES('old','alice','2026-09'); INSERT INTO category_budgets(id,budget_id,category_id,assigned_cents,original_target_cents) VALUES('cap','old','fuel',12000000,12000000)",
    );
    const s = (await (await req('/budgets/2026-09/summary')).json()) as {
      spendingLimit: null;
      weeklyAvailable: null;
      categories: { id: string; assigned: number }[];
    };
    expect(s.spendingLimit).toBeNull();
    expect(s.weeklyAvailable).toBeNull();
    expect(s.categories.find((b) => b.id === 'fuel')?.assigned).toBe(120000);
  });
  it('preserves monthly total and original targets, rejects spent moves, and fences concurrent moves', async () => {
    await plan();
    await req('/transactions', {
      type: 'expense',
      amount: 80000,
      occurredOn: date,
      categoryId: 'fuel',
    });
    const s = (await (await req(`/budgets/${month}/summary`)).json()) as {
      revision: number;
    };
    const body = {
      id: crypto.randomUUID(),
      sourceId: 'fuel',
      destinationId: 'food',
      amount: 20000,
      revision: s.revision,
    };
    const responses = await Promise.all([
      req(`/budgets/${month}/moves`, body),
      req(`/budgets/${month}/moves`, { ...body, id: crypto.randomUUID() }),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    const updated = (await (
      await req(`/budgets/${month}/summary`)
    ).json()) as Awaited<ReturnType<typeof plan>>;
    expect(updated.spendingLimit).toBe(500000);
    expect(updated.categories.find((b) => b.id === 'fuel')).toMatchObject({
      assigned: 100000,
      originalTarget: 120000,
      activity: 80000,
      available: 20000,
    });
    expect(updated.categories.find((b) => b.id === 'food')?.assigned).toBe(
      220000,
    );
    expect(
      (
        await req(`/budgets/${month}/moves`, {
          ...body,
          id: crypto.randomUUID(),
          revision: updated.revision,
          amount: 20001,
        })
      ).status,
    ).toBe(400);
    expect((await req(`/budgets/${month}/moves`, body)).status).toBe(200);
  });
  it('splits count exactly once; edits and deletion recalculate; transfers and pending excluded', async () => {
    await plan();
    const saved = (await (
      await req('/transactions', {
        type: 'expense',
        amount: 90000,
        occurredOn: date,
        splits: [
          { categoryId: 'fuel', amount: 80000 },
          { categoryId: 'food', amount: 10000 },
        ],
      })
    ).json()) as { id: string };
    await req('/transactions', {
      type: 'transfer',
      amount: 100000,
      occurredOn: date,
    });
    await req('/transactions', {
      type: 'expense',
      amount: 20000,
      occurredOn: date,
      paymentStatus: 'pending',
    });
    let s = (await (await req(`/budgets/${month}/summary`)).json()) as Awaited<
      ReturnType<typeof plan>
    >;
    expect(s.totals.totalExpense).toBe(90000);
    expect(s.categories.find((b) => b.id === 'fuel')?.activity).toBe(80000);
    expect(
      (
        await req(
          `/transactions/${saved.id}`,
          { amount: 90000, splits: [{ categoryId: 'food', amount: 80000 }] },
          'PATCH',
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await req(
          `/transactions/${saved.id}`,
          { amount: 60000, splits: [], categoryId: 'fuel' },
          'PATCH',
        )
      ).status,
    ).toBe(200);
    s = (await (await req(`/budgets/${month}/summary`)).json()) as typeof s;
    expect(s.totals.totalExpense).toBe(60000);
    await req(`/transactions/${saved.id}`, undefined, 'DELETE');
    s = (await (await req(`/budgets/${month}/summary`)).json()) as typeof s;
    expect(s.totals.totalExpense).toBe(0);
  });
  it('rolls back the entire batch if any statement fails', async () => {
    const s = await plan();
    fixture.sqlite.exec(
      "CREATE TRIGGER reject_moves BEFORE INSERT ON weekly_adjustments BEGIN SELECT RAISE(ABORT,'test failure'); END;",
    );
    expect(
      (
        await req(`/budgets/${month}/moves`, {
          id: crypto.randomUUID(),
          sourceId: 'fuel',
          destinationId: 'food',
          amount: 20000,
          revision: s.revision,
        })
      ).status,
    ).toBe(500);
    expect(
      fixture.sqlite
        .prepare(
          "SELECT assigned_cents FROM category_budgets WHERE category_id='fuel'",
        )
        .get()?.assigned_cents,
    ).toBe(12000000);
  });
  it('preserves custom weekly amounts when saving unrelated monthly allocations', async () => {
    const initial = await plan();
    const allocations = () =>
      fixture.sqlite
        .prepare(
          "SELECT * FROM weekly_allocations WHERE bucket_id='food' ORDER BY week_start",
        )
        .all();
    const custom = allocations().map((row) => ({
      weekStart: row.week_start,
      amount:
        Number(row.amount_cents) / 100 +
        (row.week_start === '2026-10-12'
          ? 100
          : row.week_start === '2026-10-26'
            ? -100
            : 0),
    }));
    const edited = await req(
      `/budgets/${month}/assignments`,
      {
        spendingLimit: 500000,
        revision: initial.revision,
        assignments: [
          {
            categoryId: 'food',
            assigned: 200000,
            pacing: 'weekly',
            weeks: custom,
          },
        ],
      },
      'PUT',
    );
    expect(edited.status).toBe(200);
    const summary = await edited.json<{ revision: number }>();
    const savedSchedule = allocations();
    const response = await req(
      `/budgets/${month}/assignments`,
      {
        spendingLimit: 500000,
        revision: summary.revision,
        assignments: [
          { categoryId: 'fuel', assigned: 121000, pacing: 'monthly' },
          { categoryId: 'food', assigned: 200000, pacing: 'weekly' },
        ],
      },
      'PUT',
    );
    expect(response.status).toBe(200);
    expect(allocations()).toEqual(savedSchedule);
  });

  it('preserves schedules and signed adjustments after a money move and unchanged save', async () => {
    const initial = await plan();
    expect(
      (
        await req(`/budgets/${month}/moves`, {
          id: crypto.randomUUID(),
          sourceId: 'food',
          destinationId: '__buffer__',
          amount: 150000,
          revision: initial.revision,
        })
      ).status,
    ).toBe(200);
    const allocations = fixture.sqlite
      .prepare('SELECT * FROM weekly_allocations ORDER BY id')
      .all();
    const adjustments = fixture.sqlite
      .prepare('SELECT * FROM weekly_adjustments ORDER BY id')
      .all();
    expect(adjustments.some((a) => Number(a.amount_cents) < 0)).toBe(true);
    const summary = await (
      await req(`/budgets/${month}/summary`)
    ).json<{ revision: number }>();
    const response = await req(
      `/budgets/${month}/assignments`,
      {
        spendingLimit: 500000,
        revision: summary.revision,
        assignments: [
          { categoryId: 'fuel', assigned: 120000, pacing: 'monthly' },
          { categoryId: 'food', assigned: 50000, pacing: 'weekly' },
        ],
      },
      'PUT',
    );
    expect(response.status).toBe(200);
    expect(
      fixture.sqlite
        .prepare('SELECT * FROM weekly_allocations ORDER BY id')
        .all(),
    ).toEqual(allocations);
    expect(
      fixture.sqlite
        .prepare('SELECT * FROM weekly_adjustments ORDER BY id')
        .all(),
    ).toEqual(adjustments);
  });

  it('does not overwrite completed weekly amounts on edits', async () => {
    const s = await plan(),
      rows = fixture.sqlite
        .prepare(
          "SELECT * FROM weekly_allocations WHERE bucket_id='food' ORDER BY week_start",
        )
        .all();
    expect(
      (
        await req(
          `/budgets/${month}/assignments`,
          {
            spendingLimit: 500000,
            revision: s.revision,
            assignments: [
              {
                categoryId: 'food',
                assigned: 200000,
                pacing: 'weekly',
                weeks: rows.map((r, i) => ({
                  weekStart: r.week_start,
                  amount:
                    Number(r.amount_cents) / 100 +
                    (i === 0 ? 1 : i === rows.length - 1 ? -1 : 0),
                })),
              },
            ],
          },
          'PUT',
        )
      ).status,
    ).toBe(400);
  });
});
describe('capture safety and queue processing', () => {
  it('manually reviews failed capture atomically and keeps uncertain payment status excluded', async () => {
    await plan();
    const id = await capture();
    await statement(
      env.DB,
      "UPDATE captures SET status='failed',extracted_json=NULL WHERE id=?",
      id,
    ).run();
    const body = {
      type: 'expense',
      amount: 1000,
      occurredOn: date,
      categoryId: 'fuel',
      paymentStatus: 'pending',
      manualReview: true,
      dateAcknowledged: true,
    };
    const results = await Promise.all([
      req('/captures/' + id + '/confirm', body),
      req('/captures/' + id + '/confirm', body),
    ]);
    expect(results.every((r) => r.status === 200 || r.status === 201)).toBe(
      true,
    );
    expect(
      fixture.sqlite.prepare('SELECT count(*) n FROM transactions').get()?.n,
    ).toBe(1);
    const s = (await (await req('/budgets/' + month + '/summary')).json()) as {
      totals: { totalExpense: number };
    };
    expect(s.totals.totalExpense).toBe(0);
  });

  it('claims a capture once when the queue delivers it concurrently', async () => {
    const id = await capture();
    await statement(
      env.DB,
      "UPDATE captures SET status='queued' WHERE id=?",
      id,
    ).run();
    await Promise.all([
      processCapture(env, { id, generation: 0 }),
      processCapture(env, { id, generation: 0 }),
    ]);
    expect(env.AI!.run).toHaveBeenCalledTimes(1);
  });

  it('confirms to receipt month, keeps Fuel override, and is idempotent under concurrent confirmation', async () => {
    await plan();
    const id = await capture(),
      body = {
        type: 'expense',
        amount: 80000,
        occurredOn: date,
        categoryId: 'fuel',
      };
    expect((await req(`/captures/${id}/confirm`, body)).status).toBe(400);
    const result = await Promise.all([
      req(`/captures/${id}/confirm`, { ...body, dateAcknowledged: true }),
      req(`/captures/${id}/confirm`, { ...body, dateAcknowledged: true }),
    ]);
    expect(result.every((r) => r.status === 200 || r.status === 201)).toBe(
      true,
    );
    expect(
      fixture.sqlite.prepare('SELECT count(*) n FROM transactions').get()?.n,
    ).toBe(1);
    expect(
      fixture.sqlite
        .prepare('SELECT category_id,occurred_on FROM transactions')
        .get(),
    ).toMatchObject({ category_id: 'fuel', occurred_on: date });
  });
  it('requires explicit completed-status verification and duplicate acknowledgement', async () => {
    const id = await capture('pending'),
      body = {
        type: 'expense',
        amount: 80000,
        occurredOn: date,
        categoryId: 'fuel',
        payee: 'Fuel Station',
        dateAcknowledged: true,
      };
    expect((await req(`/captures/${id}/confirm`, body)).status).toBe(400);
    expect(
      (
        await req(`/captures/${id}/confirm`, {
          ...body,
          statusAcknowledged: true,
        })
      ).status,
    ).toBe(201);
    const second = await capture();
    expect((await req(`/captures/${second}/confirm`, body)).status).toBe(409);
    expect(
      (
        await req(`/captures/${second}/confirm`, {
          ...body,
          duplicateAcknowledged: true,
        })
      ).status,
    ).toBe(201);
  });
  it('attaches evidence without another expense and denies other-user evidence', async () => {
    const tx = (await (
      await req('/transactions', {
        type: 'expense',
        amount: 80000,
        occurredOn: date,
      })
    ).json()) as { id: string };
    const id = await capture();
    expect(
      (await req(`/captures/${id}/attach`, { transactionId: tx.id })).status,
    ).toBe(200);
    expect(
      fixture.sqlite.prepare('SELECT count(*) n FROM transactions').get()?.n,
    ).toBe(1);
    fixture.sqlite
      .prepare("UPDATE captures SET user_id='bob' WHERE id=?")
      .run(id);
    expect((await req(`/captures/${id}`)).status).toBe(404);
  });
  it('validates AI extraction, sends data-URI, and does not create a transaction', async () => {
    const id = await capture();
    await statement(
      env.DB,
      "UPDATE captures SET status='queued' WHERE id=?",
      id,
    ).run();
    await processCapture(env, { id, generation: 0 });
    expect(
      fixture.sqlite.prepare('SELECT status FROM captures WHERE id=?').get(id)
        ?.status,
    ).toBe('ready');
    expect(
      fixture.sqlite.prepare('SELECT count(*) n FROM transactions').get()?.n,
    ).toBe(0);
    expect(vi.mocked(env.AI!.run).mock.calls[0][1]).toMatchObject({
      messages: [
        { role: 'system' },
        {
          role: 'user',
          content: [
            { type: 'text' },
            { image_url: { url: 'data:image/png;base64,AQID' } },
          ],
        },
      ],
    });
  });
  it('exposes processing failures with retry and ignores stale jobs', async () => {
    const id = await capture();
    await statement(
      env.DB,
      "UPDATE captures SET status='queued' WHERE id=?",
      id,
    ).run();
    vi.mocked(env.AI!.run).mockRejectedValue(new Error('AI unavailable'));
    const ack = vi.fn(),
      retry = vi.fn();
    await captureQueue(
      {
        messages: [{ body: { id, generation: 0 }, attempts: 1, ack, retry }],
      } as unknown as MessageBatch<{ id: string; generation: number }>,
      env,
    );
    expect(retry).toHaveBeenCalled();
    expect(
      fixture.sqlite.prepare('SELECT status FROM captures WHERE id=?').get(id)
        ?.status,
    ).toBe('failed');
    expect((await req(`/captures/${id}/retry`, {})).status).toBe(200);
    vi.mocked(env.AI!.run).mockClear();
    await processCapture(env, { id, generation: 0 });
    expect(env.AI!.run).not.toHaveBeenCalled();
  });
  it('detects identical uploads and rejects unsupported formats', async () => {
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0]);
    const upload = () =>
      app.request(
        '/captures?categoryId=fuel&month=2026-10',
        {
          method: 'POST',
          headers: { 'Content-Type': 'image/png' },
          body: bytes,
        },
        env,
      );
    const first = (await (await upload()).json()) as { id: string };
    const second = (await (await upload()).json()) as {
      id: string;
      identicalUpload: boolean;
    };
    expect(second).toMatchObject({ id: first.id, identicalUpload: true });
    expect(env.CAPTURE_QUEUE!.send).toHaveBeenCalledTimes(1);
    expect(
      (
        await app.request(
          '/captures',
          {
            method: 'POST',
            headers: { 'Content-Type': 'image/heic' },
            body: bytes,
          },
          env,
        )
      ).status,
    ).toBe(415);
  });
});
describe('monthly recommendations', () => {
  it('rejects both preview and direct application to a target plan with a different currency', async () => {
    await plan();
    vi.spyOn(env.AI!, 'run').mockResolvedValue({
      response: JSON.stringify({
        explanation: 'Keep the same limits.',
        spendingLimit: 500000,
        assignments: [
          { categoryId: 'food', assigned: 200000, pacing: 'weekly' },
        ],
      }),
    });
    const generated = await req(`/reviews/${month}/generate`, {});
    expect(generated.status).toBe(200);
    const rec = await generated.json<{ id: string }>();
    fixture.sqlite.exec(
      "UPDATE user_profiles SET preferred_currency='USD' WHERE user_id='alice'",
    );
    const created = await req('/budgets/2026-11', {}, 'PUT');
    const target = await created.json<{ revision: number }>();
    const allocated = await req(
      '/budgets/2026-11/assignments',
      {
        spendingLimit: 1000,
        revision: target.revision,
        assignments: [{ categoryId: 'food', assigned: 500, pacing: 'weekly' }],
      },
      'PUT',
    );
    expect(allocated.status).toBe(200);
    const before = await (
      await req('/budgets/2026-11/summary')
    ).json<{ revision: number }>();
    for (const action of ['preview', 'apply']) {
      const response = await req(
        `/reviews/${month}/proposals/${rec.id}/${action}`,
        { revision: before.revision },
      );
      expect(response.status).toBe(400);
      expect((await response.json<{ error: string }>()).error).toContain('NGN');
    }
    expect(await (await req('/budgets/2026-11/summary')).json()).toEqual(
      before,
    );
    expect(
      fixture.sqlite
        .prepare('SELECT applied_at FROM recommendations WHERE id=?')
        .get(rec.id)?.applied_at,
    ).toBeNull();
  });

  it('handles empty reports, invalid proposals, stale summaries, previews existing plans and applies once', async () => {
    await plan();
    const empty = (await (await req(`/reviews/${month}`)).json()) as {
      totals: { totalExpense: number };
      monthToDate: boolean;
    };
    expect(empty.totals.totalExpense).toBe(0);
    expect(empty.monthToDate).toBe(true);
    vi.mocked(env.AI!.run).mockResolvedValue({
      response: JSON.stringify({
        explanation: 'Use your original targets and keep a buffer.',
        spendingLimit: 500000,
        assignments: [
          { categoryId: 'fuel', assigned: 100000, pacing: 'monthly' },
          { categoryId: 'food', assigned: 250000, pacing: 'weekly' },
        ],
      }),
    });
    const result = await req(`/reviews/${month}/generate`, {});
    expect(result.status).toBe(200);
    const rec = (await result.json()) as { id: string };
    await req('/budgets/2026-11', {}, 'PUT');
    const target = (await (await req('/budgets/2026-11/summary')).json()) as {
      revision: number;
    };
    const allocated = (await (
      await req(
        '/budgets/2026-11/assignments',
        {
          spendingLimit: 500000,
          revision: target.revision,
          assignments: [
            { categoryId: 'fuel', assigned: 120000, pacing: 'monthly' },
            { categoryId: 'food', assigned: 200000, pacing: 'weekly' },
          ],
        },
        'PUT',
      )
    ).json()) as { revision: number };
    expect(
      (
        await req('/budgets/2026-11/moves', {
          id: crypto.randomUUID(),
          sourceId: 'fuel',
          destinationId: 'food',
          amount: 20000,
          revision: allocated.revision,
        })
      ).status,
    ).toBe(200);

    const preview = await req(
      `/reviews/${month}/proposals/${rec.id}/preview`,
      {},
    );
    expect(preview.status).toBe(200);
    const body = (await preview.json()) as {
      revision: number;
      existing: unknown;
    };
    expect(body.existing).toBeTruthy();
    expect(
      (
        await req(`/reviews/${month}/proposals/${rec.id}/apply`, {
          revision: body.revision,
        })
      ).status,
    ).toBe(200);
    await req('/transactions', {
      type: 'expense',
      amount: 1,
      occurredOn: date,
    });
    const stale = (await (await req(`/reviews/${month}`)).json()) as {
      recommendation: { stale: boolean };
    };
    expect(stale.recommendation.stale).toBe(true);
    expect(
      (await req(`/reviews/${month}/proposals/${rec.id}/preview`, {})).status,
    ).toBe(409);
  });
});
