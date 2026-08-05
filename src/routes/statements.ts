import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import * as schema from '../database/schema';
import { generateId, nowISO } from '../shared/utils';

const env = (c: { env: unknown }) => c.env as { DB: D1Database; R2: R2Bucket; RECEIPT_PROCESSING: Queue; STATEMENT_PROCESSING: Queue };

export const statementsRouter = new Hono();

statementsRouter.post('/upload', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const e = env(c);

  const formData = await c.req.parseBody();
  const file = formData['file'] as File | undefined;
  if (!file) return c.json({ error: 'No file provided' }, 400);

  const budgetPeriodId = formData['budgetPeriodId'] as string | undefined;

  const filename = `statement-${Date.now()}-${Math.round(Math.random() * 10000)}-${file.name}`;
  const key = `statements/${user.id}/${filename}`;

  if (e.R2) {
    await e.R2.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });
  }

  const [upload] = await db
    .insert(schema.statementUploads)
    .values({
      id: generateId(),
      userId: user.id,
      budgetPeriodId: budgetPeriodId ?? null,
      fileName: file.name,
      fileType: file.type,
      storagePath: key,
      uploadStatus: 'uploaded',
      uploadedAt: nowISO(),
    })
    .returning();

  if (e.STATEMENT_PROCESSING) {
    await e.STATEMENT_PROCESSING.send({
      uploadId: upload.id,
      userId: user.id,
      budgetPeriodId: budgetPeriodId ?? null,
      fileName: file.name,
      storagePath: key,
    });
  }

  return c.json(upload, 201);
});

statementsRouter.get('/:id/transactions', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id')!;

  const transactions = await db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.statementUploadId, id));

  return c.json(transactions);
});
