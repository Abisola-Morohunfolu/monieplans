import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '../database/schema';
import { nowISO, generateId, toCents } from '../shared/utils';
import { parseStatement, type ParsedTransaction } from '../lib/extract';

interface Env {
  DB: D1Database;
  R2: R2Bucket;
}

interface StatementMessage {
  uploadId: string;
  userId: string;
  budgetPeriodId: string | null;
  fileName: string;
  storagePath: string;
}

function generateTransactionHash(txn: ParsedTransaction): string {
  const raw = `${txn.date}|${txn.amount}|${txn.direction}|${txn.description}|${txn.reference ?? ''}`;
  return hashString(raw);
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

export async function processStatementMessages(
  batch: MessageBatch<StatementMessage>,
  env: Env,
) {
  const db = drizzle(env.DB, { schema });

  for (const msg of batch.messages) {
    const { uploadId, userId, budgetPeriodId, fileName, storagePath } =
      msg.body;

    try {
      await db
        .update(schema.statementUploads)
        .set({ uploadStatus: 'processing' })
        .where(eq(schema.statementUploads.id, uploadId));

      const r2Object = await env.R2.get(storagePath);
      if (!r2Object) {
        await db
          .update(schema.statementUploads)
          .set({
            uploadStatus: 'failed',
            parseErrorSummary: 'File not found in R2',
          })
          .where(eq(schema.statementUploads.id, uploadId));
        msg.ack();
        continue;
      }

      console.log(`[statement] processing upload=${uploadId} file=${fileName}`);

      const pdfBuffer = await r2Object.arrayBuffer();

      const parsed = await parseStatement(pdfBuffer, fileName);

      const rawOutputJson = JSON.stringify(parsed);

      const summary = parsed.summary;
      if (summary) {
        await db
          .update(schema.statementUploads)
          .set({
            rawParserOutputJson: rawOutputJson,
            statementPeriodStart: summary.periodStart,
            statementPeriodEnd: summary.periodEnd,
          })
          .where(eq(schema.statementUploads.id, uploadId));
      }

      console.log(
        `[statement] parsed ${parsed.transactions.length} transactions` +
          (summary
            ? ` period=${summary.periodStart ?? ''}..${summary.periodEnd ?? ''}`
            : ''),
      );

      const existingHashes = new Set<string>();
      const existingTxns = await db
        .select({ externalHash: schema.transactions.externalHash })
        .from(schema.transactions)
        .where(eq(schema.transactions.userId, userId));
      for (const row of existingTxns) {
        if (row.externalHash) {
          existingHashes.add(row.externalHash);
        }
      }

      console.log(
        `[statement] found ${existingHashes.size} existing transactions for user`,
      );

      const transactionsToInsert: (typeof schema.transactions.$inferInsert)[] =
        [];
      let skipped = 0;
      for (const txn of parsed.transactions) {
        const hash = generateTransactionHash(txn);
        if (existingHashes.has(hash)) {
          skipped++;
          continue;
        }

        transactionsToInsert.push({
          id: generateId(),
          userId,
          statementUploadId: uploadId,
          budgetPeriodId,
          postedDate: txn.date || nowISO().split('T')[0],
          descriptionRaw: txn.description,
          descriptionNormalized: txn.description.trim().toLowerCase(),
          amountCents: toCents(txn.amount),
          currency: 'NGN',
          direction: txn.direction,
          merchantName: txn.merchantName ?? null,
          categoryId: null,
          categoryConfidence: null,
          isUserCorrected: false,
          isExcludedFromAnalysis: false,
          parentTransactionId: null,
          isInternalBookkeeping: txn.isInternalBookkeeping ?? false,
          transactionType: txn.transactionType,
          rawAiOutputJson: '',
          externalHash: hash,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        });

        existingHashes.add(hash);
      }

      console.log(
        `[statement] skipped ${skipped} duplicates, inserting ${transactionsToInsert.length} new transactions`,
      );

      if (transactionsToInsert.length > 0) {
        const CHUNK_SIZE = 50;
        const chunkCount = Math.ceil(transactionsToInsert.length / CHUNK_SIZE);
        for (let i = 0; i < transactionsToInsert.length; i += CHUNK_SIZE) {
          console.log(
            `[statement] ${JSON.stringify(Object.keys(transactionsToInsert[0] ?? {}))}`,
          );
          await db
            .insert(schema.transactions)
            .values(transactionsToInsert.slice(i, i + CHUNK_SIZE));
        }
        console.log(
          `[statement] inserted ${transactionsToInsert.length} transactions in ${chunkCount} chunks`,
        );
      }

      await db
        .update(schema.statementUploads)
        .set({ uploadStatus: 'processed', processedAt: nowISO() })
        .where(eq(schema.statementUploads.id, uploadId));

      console.log(`[statement] finished upload=${uploadId}`);

      msg.ack();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error processing statement:', errorMessage);
      console.error(`Full error message ${JSON.stringify(err)}`);
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
