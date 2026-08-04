import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.provider';
import * as schema from '../database/schema';

@Injectable()
export class StatementsRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async createStatementUpload(data: typeof schema.statementUploads.$inferInsert) {
    const [upload] = await this.db
      .insert(schema.statementUploads)
      .values(data)
      .returning();
    return upload;
  }

  async updateStatementUpload(
    id: string,
    data: Partial<typeof schema.statementUploads.$inferInsert>,
  ) {
    const [upload] = await this.db
      .update(schema.statementUploads)
      .set(data)
      .where(eq(schema.statementUploads.id, id))
      .returning();
    return upload;
  }

  async getStatementUpload(id: string) {
    const [upload] = await this.db
      .select()
      .from(schema.statementUploads)
      .where(eq(schema.statementUploads.id, id))
      .limit(1);
    return upload;
  }

  async createTransactions(transactions: typeof schema.transactions.$inferInsert[]) {
    if (transactions.length === 0) return [];
    return this.db.insert(schema.transactions).values(transactions).returning();
  }

  async getTransactions(statementUploadId: string) {
    return this.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.statementUploadId, statementUploadId));
  }

  async getTransactionCategoryRules(userId: string) {
    return this.db
      .select()
      .from(schema.transactionCategoryRules)
      .where(eq(schema.transactionCategoryRules.userId, userId));
  }
}
