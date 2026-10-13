import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import type { Env } from '../index';
import { atomic, revision, statement } from '../services/ledger';
import {
  boundedImage,
  enqueue,
  getCapture,
  validateImage,
  type CaptureRow,
} from '../services/capture';
import { extractionSchema } from '../services/ai';
import { createTransactionSchema, monthParamSchema } from '../shared/schemas';
import {
  insertExpense,
  transactionDetails,
  validateExpense,
  transactionCurrency,
} from '../services/transactions';
import { assertCategoryVisible, getPreferredCurrency } from './helpers';
export const capturesRouter = new Hono<{ Bindings: Env }>();
async function duplicates(
  db: D1Database,
  uid: string,
  amount: number,
  date: string,
  payee: string | null,
) {
  return (
    await statement(
      db,
      "SELECT id,payee,occurred_on occurredOn,amount_cents/100.0 amount FROM transactions WHERE user_id=? AND deleted_at IS NULL AND type='expense' AND amount_cents=? AND occurred_on BETWEEN date(?,'-1 day') AND date(?,'+1 day') AND (LOWER(COALESCE(payee,''))=LOWER(?) OR ?='')",
      uid,
      Math.round(amount * 100),
      date,
      date,
      payee ?? '',
      payee ?? '',
    ).all()
  ).results;
}
capturesRouter.post('/', async (c) => {
  const uid = c.get('user').id,
    db = c.env.DB;
  if (!c.env.RECEIPTS || !c.env.CAPTURE_QUEUE)
    throw new HTTPException(503, {
      message: 'Capture storage is not configured. Enter an expense manually.',
    });
  const category = c.req.query('categoryId') ?? null,
    m = c.req.query('month') ?? null;
  if (category) await assertCategoryVisible(c.get('db'), uid, category);
  if (m && !monthParamSchema.safeParse(m).success)
    throw new HTTPException(400, { message: 'Invalid month' });
  const mime = (c.req.header('content-type') ?? '').split(';')[0],
    bytes = await boundedImage(c.req.raw);
  validateImage(bytes, mime);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = [...new Uint8Array(digest)]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');
  const existing = await statement(
    db,
    'SELECT * FROM captures WHERE user_id=? AND sha256=?',
    uid,
    hash,
  ).first<CaptureRow>();
  if (existing)
    return c.json({
      id: existing.id,
      identicalUpload: true,
      transactionId: existing.transaction_id,
    });
  const id = crypto.randomUUID(),
    key = `${uid}/${hash}`,
    now = new Date().toISOString();
  await c.env.RECEIPTS.put(key, bytes, { httpMetadata: { contentType: mime } });
  await statement(
    db,
    'INSERT INTO captures(id,user_id,object_key,sha256,mime_type,size_bytes,default_category_id,opened_month,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,sha256) DO NOTHING',
    id,
    uid,
    key,
    hash,
    mime,
    bytes.length,
    category,
    m,
    now,
    now,
  ).run();
  const row = await statement(
    db,
    'SELECT * FROM captures WHERE user_id=? AND sha256=?',
    uid,
    hash,
  ).first<CaptureRow>();
  if (!row) throw new HTTPException(500, { message: 'Could not save upload' });
  if (row.id === id) await enqueue(c.env, row);
  return c.json(
    {
      id: row.id,
      identicalUpload: row.id !== id,
      transactionId: row.transaction_id,
    },
    201,
  );
});
capturesRouter.get('/', async (c) =>
  c.json(
    (
      await statement(
        c.env.DB,
        'SELECT id,status,error,default_category_id defaultCategoryId,opened_month openedMonth,transaction_id transactionId,created_at createdAt FROM captures WHERE user_id=? ORDER BY created_at DESC LIMIT 50',
        c.get('user').id,
      ).all()
    ).results,
  ),
);
capturesRouter.get('/:id', async (c) => {
  const row = await getCapture(c.env, c.get('user').id, c.req.param('id'));
  const extracted = row.extracted_json
    ? extractionSchema.parse(JSON.parse(row.extracted_json))
    : null;
  const likely =
    extracted?.amount && extracted.occurredOn
      ? await duplicates(
          c.env.DB,
          row.user_id,
          extracted.amount,
          extracted.occurredOn,
          extracted.payee,
        )
      : [];
  return c.json({
    id: row.id,
    status: row.status,
    attempt: row.attempt,
    error: row.error,
    defaultCategoryId: row.default_category_id,
    openedMonth: row.opened_month,
    extracted,
    transactionId: row.transaction_id,
    likelyDuplicates: likely,
  });
});
capturesRouter.get('/:id/image', async (c) => {
  const row = await getCapture(c.env, c.get('user').id, c.req.param('id'));
  const image = await c.env.RECEIPTS?.get(row.object_key);
  if (!image)
    throw new HTTPException(404, { message: 'Evidence image not found' });
  return new Response(image.body, {
    headers: {
      'content-type': row.mime_type,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
      'content-disposition': 'inline',
    },
  });
});
capturesRouter.post('/:id/retry', async (c) => {
  const row = await getCapture(c.env, c.get('user').id, c.req.param('id'));
  if (row.transaction_id || row.status === 'confirmed')
    throw new HTTPException(409, {
      message: 'This capture was already saved.',
    });
  if (
    row.status === 'processing' &&
    Date.now() -
      Date.parse(
        (await statement(
          c.env.DB,
          'SELECT updated_at FROM captures WHERE id=?',
          row.id,
        ).first<{ updated_at: string }>())!.updated_at,
      ) <
      120000
  )
    throw new HTTPException(409, {
      message: 'Processing is still running. Try again shortly.',
    });
  const updated = await statement(
    c.env.DB,
    "UPDATE captures SET status='queued',generation=generation+1,error=NULL,updated_at=? WHERE id=? AND transaction_id IS NULL RETURNING *",
    new Date().toISOString(),
    row.id,
  ).first<CaptureRow>();
  if (!updated)
    throw new HTTPException(409, { message: 'Capture changed. Refresh.' });
  await enqueue(c.env, updated);
  return c.json({ ok: true });
});
capturesRouter.post('/:id/confirm', async (c) => {
  const uid = c.get('user').id,
    db = c.env.DB,
    version = await revision(db, uid),
    row = await getCapture(c.env, uid, c.req.param('id'));
  if (row.transaction_id)
    return c.json(await transactionDetails(db, uid, row.transaction_id));
  const result = createTransactionSchema
    .extend({
      manualReview: z.boolean().default(false),
      duplicateAcknowledged: z.boolean().default(false),
      statusAcknowledged: z.boolean().default(false),
      dateAcknowledged: z.boolean().default(false),
    })
    .safeParse(await c.req.json());
  if (!result.success)
    throw new HTTPException(400, {
      message: 'Check the amount, date, category, and payment status.',
    });
  if (row.status !== 'ready' && !result.data.manualReview)
    throw new HTTPException(409, {
      message: 'Wait for extraction or attach this image to a manual expense.',
    });
  const body = result.data,
    extracted = row.extracted_json
      ? extractionSchema.parse(JSON.parse(row.extracted_json))
      : null;
  if (body.paymentStatus !== 'completed' && !body.manualReview)
    throw new HTTPException(400, {
      message:
        'Pending or failed payments cannot be saved as completed expenses. Use manual entry to record their status.',
    });
  if (
    body.paymentStatus === 'completed' &&
    extracted?.paymentStatus !== 'completed' &&
    !body.statusAcknowledged
  )
    throw new HTTPException(400, {
      message: 'Confirm that this payment completed before saving.',
    });
  if (
    row.opened_month &&
    body.occurredOn.slice(0, 7) !== row.opened_month &&
    !body.dateAcknowledged
  )
    throw new HTTPException(400, {
      message: 'This receipt belongs to a different month. Confirm its date.',
    });
  if (
    (
      await duplicates(
        db,
        uid,
        body.amount,
        body.occurredOn,
        body.payee ?? null,
      )
    ).length &&
    !body.duplicateAcknowledged
  )
    throw new HTTPException(409, {
      message:
        'A similar payment already exists. Attach this evidence or confirm it is a separate payment.',
    });
  const currency = await transactionCurrency(
    db,
    uid,
    body.occurredOn,
    await getPreferredCurrency(c.get('db'), uid),
  );
  await validateExpense(db, uid, body, currency);
  try {
    await atomic(db, uid, version, [
      statement(
        db,
        'INSERT INTO mutation_guards(id,valid) VALUES(?,CASE WHEN EXISTS(SELECT 1 FROM captures WHERE id=? AND generation=? AND status=? AND transaction_id IS NULL) THEN 1 ELSE 0 END)',
        row.id,
        row.id,
        row.generation,
        row.status,
      ),
      ...insertExpense(db, uid, row.id, body, currency, 'capture'),
      statement(
        db,
        "UPDATE captures SET transaction_id=?,status='confirmed',generation=generation+1,updated_at=? WHERE id=? AND transaction_id IS NULL",
        row.id,
        new Date().toISOString(),
        row.id,
      ),
      statement(db, 'DELETE FROM mutation_guards WHERE id=?', row.id),
    ]);
  } catch (error) {
    const latest = await getCapture(c.env, uid, row.id);
    if (latest.transaction_id)
      return c.json(await transactionDetails(db, uid, latest.transaction_id));
    throw error;
  }
  return c.json(await transactionDetails(db, uid, row.id), 201);
});
capturesRouter.post('/:id/attach', async (c) => {
  const uid = c.get('user').id,
    db = c.env.DB,
    row = await getCapture(c.env, uid, c.req.param('id'));
  const result = z
    .object({ transactionId: z.string() })
    .safeParse(await c.req.json());
  if (!result.success)
    throw new HTTPException(400, { message: 'Choose an expense.' });
  const tx = await transactionDetails(db, uid, result.data.transactionId);
  if (tx.type !== 'expense')
    throw new HTTPException(400, { message: 'Attach evidence to an expense.' });
  if (row.transaction_id && row.transaction_id !== tx.id)
    throw new HTTPException(409, {
      message: 'This image is already attached to another transaction.',
    });
  const changed = await statement(
    db,
    "UPDATE captures SET transaction_id=?,status='confirmed',generation=generation+1,updated_at=? WHERE id=? AND (transaction_id IS NULL OR transaction_id=?) RETURNING id",
    tx.id,
    new Date().toISOString(),
    row.id,
    tx.id,
  ).first();
  if (!changed)
    throw new HTTPException(409, {
      message: 'Evidence was attached elsewhere. Refresh.',
    });
  return c.json({ ok: true });
});
