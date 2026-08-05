import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '../database/schema';
import { nowISO } from '../shared/utils';

interface Env {
  DB: D1Database;
}

interface ReceiptMessage {
  receiptId: string;
  userId: string;
  fileName: string;
  storagePath: string;
}

export async function processReceiptMessages(batch: MessageBatch<ReceiptMessage>, env: Env) {
  const db = drizzle(env.DB, { schema });

  for (const msg of batch.messages) {
    const { receiptId, fileName } = msg.body;

    try {
      let parsedAmount = 1500;
      const fileNumbers = fileName.match(/\d+/g);
      if (fileNumbers && fileNumbers.length > 0) {
        const matchedNum = parseFloat(fileNumbers[0]);
        if (!isNaN(matchedNum) && matchedNum > 0) {
          parsedAmount = matchedNum;
        }
      } else {
        parsedAmount = Math.round((500 + Math.random() * 9500) * 100) / 100;
      }

      const merchants = ['Starbucks', 'Uber', 'Walmart', 'Amazon', 'Shell', 'Target', 'McDonalds'];
      const parsedMerchantName = merchants[Math.floor(Math.random() * merchants.length)];
      const parsedExpenseDate = new Date().toISOString().split('T')[0];

      await db
        .update(schema.expenseEntryReceipts)
        .set({
          parseStatus: 'parsed',
          parsedAmountCents: Math.round(parsedAmount * 100),
          parsedMerchantName,
          parsedExpenseDate,
          rawParserOutputJson: JSON.stringify({
            confidence: 95,
            extractedAt: nowISO(),
            mockParser: 'Antigravity Mock OCR',
            suggestedCategory: 'uncategorized',
          }),
          processedAt: nowISO(),
        })
        .where(eq(schema.expenseEntryReceipts.id, receiptId));

      msg.ack();
    } catch (err) {
      console.error('Error processing receipt:', err);
      try {
        await db
          .update(schema.expenseEntryReceipts)
          .set({ parseStatus: 'failed' })
          .where(eq(schema.expenseEntryReceipts.id, receiptId));
      } catch (updateErr) {
        console.error('Failed to mark receipt as failed:', updateErr);
      }
      msg.retry();
    }
  }
}
