import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.provider';
import * as schema from '../database/schema';

@Injectable()
export class AnalyticsRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async createRecommendationSnapshot(data: typeof schema.recommendationSnapshots.$inferInsert) {
    const [snapshot] = await this.db
      .insert(schema.recommendationSnapshots)
      .values(data)
      .returning();
    return snapshot;
  }

  async getActiveRecommendations(userId: string) {
    return this.db
      .select()
      .from(schema.recommendationSnapshots)
      .where(
        and(
          eq(schema.recommendationSnapshots.userId, userId),
          eq(schema.recommendationSnapshots.status, 'active')
        )
      );
  }

  async updateRecommendationStatus(id: string, userId: string, status: 'dismissed' | 'accepted') {
    const [snapshot] = await this.db
      .update(schema.recommendationSnapshots)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(schema.recommendationSnapshots.id, id),
          eq(schema.recommendationSnapshots.userId, userId)
        )
      )
      .returning();
    return snapshot;
  }

  async logAuditEvent(data: typeof schema.auditEvents.$inferInsert) {
    const [event] = await this.db
      .insert(schema.auditEvents)
      .values(data)
      .returning();
    return event;
  }
}
