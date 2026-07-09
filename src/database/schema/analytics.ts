import { numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { budgetPeriods } from './budget-periods';

export const recommendationTypeEnum = pgEnum('recommendation_type', [
  'reduce_category',
  'adjust_goal',
  'risk_alert',
  'recurring_spend_notice',
]);

export const recommendationStatusEnum = pgEnum('recommendation_status', [
  'active',
  'dismissed',
  'accepted',
  'expired',
]);

export const actorTypeEnum = pgEnum('actor_type', ['user', 'system']);

export const recommendationSnapshots = pgTable('recommendation_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  budgetPeriodId: uuid('budget_period_id').references(() => budgetPeriods.id),
  recommendationType: recommendationTypeEnum('recommendation_type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  estimatedMonthlyImpact: numeric('estimated_monthly_impact', { precision: 15, scale: 2 }),
  evidenceJson: text('evidence_json'),
  status: recommendationStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const auditEvents = pgTable('audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  eventType: text('event_type').notNull(),
  actorType: actorTypeEnum('actor_type').notNull().default('user'),
  changeSummaryJson: text('change_summary_json'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
