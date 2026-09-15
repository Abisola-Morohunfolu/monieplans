import { Hono } from 'hono';
import { and, asc, desc, eq, or, isNull, sql } from 'drizzle-orm';
import * as schema from '../database/schema';
import { listCategoriesQuerySchema } from '../shared/schemas';
import { validateQuery } from '../shared/validate';
import { paginated, resolveLimitOffset } from '../shared/pagination';

export const categoriesRouter = new Hono();

categoriesRouter.get(
  '/',
  validateQuery(listCategoriesQuerySchema),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const query = c.get('query') as unknown as ReturnType<
      typeof listCategoriesQuerySchema.parse
    >;
    const { limit, offset } = resolveLimitOffset(query);

    const conditions: (ReturnType<typeof eq> | ReturnType<typeof or>)[] = [
      or(
        isNull(schema.categories.userId),
        eq(schema.categories.userId, user.id),
      ),
    ];

    if (query.search) {
      const searchTerm = `%${query.search}%`;
      conditions.push(
        sql`(LOWER(${schema.categories.name}) LIKE LOWER(${searchTerm}) OR LOWER(${schema.categories.code}) LIKE LOWER(${searchTerm}) OR LOWER(COALESCE(${schema.categories.groupName}, '')) LIKE LOWER(${searchTerm}))`,
      );
    }

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.categories)
      .where(and(...conditions));
    const total = Number(countRow?.count ?? 0);

    const categories = await db
      .select()
      .from(schema.categories)
      .where(and(...conditions))
      .orderBy(desc(schema.categories.isSystem), asc(schema.categories.name))
      .limit(limit)
      .offset(offset);

    return c.json(paginated(categories, total, limit, offset));
  },
);
