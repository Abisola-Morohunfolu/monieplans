import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { user } from './auth';
import { budgetPeriods } from './budget-periods';

export const recommendationSnapshots = sqliteTable('recommendation_snapshots', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  budgetPeriodId: text('budget_period_id').references(() => budgetPeriods.id),
  recommendationType: text('recommendation_type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  estimatedMonthlyImpactCents: integer('estimated_monthly_impact_cents'),
  evidenceJson: text('evidence_json'),
  status: text('status').notNull().default('active'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const auditEvents = sqliteTable('audit_events', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  eventType: text('event_type').notNull(),
  actorType: text('actor_type').notNull().default('user'),
  changeSummaryJson: text('change_summary_json'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});
