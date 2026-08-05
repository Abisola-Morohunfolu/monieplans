import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import Papa from 'papaparse';
import * as schema from '../database/schema';
import { nowISO, generateId } from '../shared/utils';

interface Env {
  DB: D1Database;
}

interface StatementMessage {
  uploadId: string;
  userId: string;
  budgetPeriodId: string | null;
  fileName: string;
  storagePath: string;
}

export async function processStatementMessages(batch: MessageBatch<StatementMessage>, env: Env) {
  const db = drizzle(env.DB, { schema });

  for (const msg of batch.messages) {
    const { uploadId, userId, budgetPeriodId, fileName, storagePath } = msg.body;

    try {
      await db
        .update(schema.statementUploads)
        .set({ uploadStatus: 'processing' })
        .where(eq(schema.statementUploads.id, uploadId));

      const fileContent = await fetchTextFromR2(storagePath);
      if (!fileContent) {
        await db
          .update(schema.statementUploads)
          .set({ uploadStatus: 'failed', parseErrorSummary: 'Failed to read file from R2' })
          .where(eq(schema.statementUploads.id, uploadId));
        msg.ack();
        continue;
      }

      const result = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
      const records = result.data as Record<string, string>[];

      const rules = await db
        .select()
        .from(schema.transactionCategoryRules)
        .where(eq(schema.transactionCategoryRules.userId, userId));

      const transactions = records.map((record) => {
        const rawAmount = record.Amount || record.amount || '0';
        const amount = parseFloat(rawAmount.replace(/,/g, ''));
        const description = record.Description || record.description || '';
        const dateStr = record.Date || record.date;

        let direction: string = amount < 0 ? 'debit' : 'credit';
        if (record.Direction || record.direction) {
          direction = (record.Direction || record.direction).toLowerCase() === 'credit' ? 'credit' : 'debit';
        }

        let categoryId: string | null = null;
        for (const rule of rules) {
          if (rule.matchType === 'exact_text' && description === rule.matchValue) {
            categoryId = rule.categoryId;
            break;
          }
          if (rule.matchType === 'contains_text' && description.toLowerCase().includes(rule.matchValue.toLowerCase())) {
            categoryId = rule.categoryId;
            break;
          }
        }

        return {
          id: generateId(),
          userId,
          statementUploadId: uploadId,
          budgetPeriodId,
          postedDate: dateStr ? new Date(dateStr).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          descriptionRaw: description,
          descriptionNormalized: description.trim().toLowerCase(),
          amountCents: Math.round(Math.abs(amount) * 100),
          direction,
          categoryId,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };
      });

      await db.insert(schema.transactions).values(transactions);

      await db
        .update(schema.statementUploads)
        .set({ uploadStatus: 'processed', processedAt: nowISO() })
        .where(eq(schema.statementUploads.id, uploadId));

      msg.ack();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error processing statement:', errorMessage);
      try {
        await db
          .update(schema.statementUploads)
          .set({ uploadStatus: 'failed', parseErrorSummary: errorMessage })
          .where(eq(schema.statementUploads.id, uploadId));
      } catch (updateErr) {
        console.error('Failed to update statement status:', updateErr);
      }
      msg.retry();
    }
  }
}

async function fetchTextFromR2(key: string): Promise<string | null> {
  try {
    const response = await fetch(key.startsWith('/') ? key : '/' + key);
    if (!response.ok) return null;
    return response.text();
  } catch {
    return null;
  }
}
