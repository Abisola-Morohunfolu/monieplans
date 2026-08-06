import { Hono } from 'hono';
import { eq, or, isNull } from 'drizzle-orm';
import * as schema from '../database/schema';

export const categoriesRouter = new Hono();

categoriesRouter.get('/', async (c) => {
  const user = c.get('user');
  const db = c.get('db');

  const categories = await db
    .select()
    .from(schema.categories)
    .where(
      or(
        isNull(schema.categories.userId),
        eq(schema.categories.userId, user.id),
      ),
    );

  return c.json(categories);
});
