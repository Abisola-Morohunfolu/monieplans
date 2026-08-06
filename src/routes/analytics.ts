import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { and, eq } from 'drizzle-orm';
import * as schema from '../database/schema';
import { generateId, nowISO, toCents } from '../shared/utils';
import {
  updateRecommendationStatusSchema,
  generateInsightsSchema,
} from '../shared/schemas';
import { validateJson } from '../shared/validate';

export const analyticsRouter = new Hono();

analyticsRouter.get('/recommendations', async (c) => {
  const user = c.get('user');
  const db = c.get('db');

  const recommendations = await db
    .select()
    .from(schema.recommendationSnapshots)
    .where(
      and(
        eq(schema.recommendationSnapshots.userId, user.id),
        eq(schema.recommendationSnapshots.status, 'active'),
      ),
    );

  return c.json(recommendations);
});

analyticsRouter.patch(
  '/recommendations/:id/status',
  validateJson(updateRecommendationStatusSchema),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const id = c.req.param('id')!;
    const { status } = c.get('body') as unknown as {
      status: 'dismissed' | 'accepted';
    };

    const [snapshot] = await db
      .update(schema.recommendationSnapshots)
      .set({ status, updatedAt: nowISO() })
      .where(
        and(
          eq(schema.recommendationSnapshots.id, id),
          eq(schema.recommendationSnapshots.userId, user.id),
        ),
      )
      .returning();

    if (!snapshot)
      throw new HTTPException(404, { message: 'Recommendation not found' });
    return c.json(snapshot);
  },
);

analyticsRouter.post(
  '/generate-insights',
  validateJson(generateInsightsSchema),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const { budgetPeriodId } = c.get('body') as unknown as {
      budgetPeriodId: string;
    };

    const [recommendation] = await db
      .insert(schema.recommendationSnapshots)
      .values({
        id: generateId(),
        userId: user.id,
        budgetPeriodId,
        recommendationType: 'reduce_category',
        title: 'High spending on Dining',
        body: 'You have spent 40% of your budget on dining. Consider reducing it to save more.',
        estimatedMonthlyImpactCents: toCents(50),
        createdAt: nowISO(),
        updatedAt: nowISO(),
      })
      .returning();

    await db.insert(schema.auditEvents).values({
      id: generateId(),
      userId: user.id,
      entityType: 'budget_period',
      entityId: budgetPeriodId,
      eventType: 'insight_generated',
      actorType: 'system',
      createdAt: nowISO(),
    });

    return c.json(recommendation, 201);
  },
);
