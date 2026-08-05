import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '../database/schema';
import { nowISO, generateId, toCents } from '../shared/utils';
import { parseReceipt } from '../lib/extract';

interface Env {
  DB: D1Database;
  R2: R2Bucket;
}

interface ReceiptMessage {
  receiptId: string;
  userId: string;
  fileName: string;
  storagePath: string;
}

export async function processReceiptMessages(
  batch: MessageBatch<ReceiptMessage>,
  env: Env,
) {
  const db = drizzle(env.DB, { schema });

  for (const msg of batch.messages) {
    const { receiptId, fileName, storagePath } = msg.body;

    try {
      const r2Object = await env.R2.get(storagePath);
      if (!r2Object) {
        await db
          .update(schema.expenseEntryReceipts)
          .set({ parseStatus: 'failed' })
          .where(eq(schema.expenseEntryReceipts.id, receiptId));
        msg.ack();
        continue;
      }

      const fileBuffer = await r2Object.arrayBuffer();
      const mimeType =
        r2Object.httpMetadata?.contentType ?? 'application/octet-stream';

      const parsed = await parseReceipt(fileBuffer, fileName, mimeType);

      const parsedAmountCents =
        parsed.total != null ? toCents(parsed.total) : null;

      await db
        .update(schema.expenseEntryReceipts)
        .set({
          parseStatus: 'parsed',
          parsedAmountCents,
          parsedExpenseDate: parsed.date ?? null,
          parsedMerchantName: parsed.merchantName ?? null,
          rawParserOutputJson: JSON.stringify(parsed),
          processedAt: nowISO(),
        })
        .where(eq(schema.expenseEntryReceipts.id, receiptId));

      for (const item of parsed.items) {
        await db.insert(schema.receiptLineItems).values({
          id: generateId(),
          receiptId,
          name: item.name,
          quantity: item.quantity > 0 ? item.quantity : 1,
          unitPriceCents: item.unitPrice > 0 ? toCents(item.unitPrice) : null,
          totalPriceCents: toCents(item.totalPrice || 0),
          status: 'suggested',
          createdAt: nowISO(),
          updatedAt: nowISO(),
        });
      }

      msg.ack();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error processing receipt:', errorMessage);
      try {
        await db
          .update(schema.expenseEntryReceipts)
          .set({
            parseStatus: 'failed',
            rawParserOutputJson: JSON.stringify({ error: errorMessage }),
          })
          .where(eq(schema.expenseEntryReceipts.id, receiptId));
      } catch (updateErr) {
        console.error('Failed to mark receipt as failed:', updateErr);
      }
      msg.retry();
    }
  }
}
