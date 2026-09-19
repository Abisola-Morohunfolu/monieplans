import { Hono } from 'hono';
import { and, asc, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { generateId, nowISO } from '../shared/utils';
import { serializeCategory } from '../shared/serializers';
import * as schema from '../database/schema';
import {
  createCategorySchema,
  listCategoriesQuerySchema,
} from '../shared/schemas';
import { validateJson, validateQuery } from '../shared/validate';
import { paginated, resolveLimitOffset } from '../shared/pagination';

export const categoriesRouter = new Hono();

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

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

    return c.json(
      paginated(categories.map(serializeCategory), total, limit, offset),
    );
  },
);

categoriesRouter.post('/', validateJson(createCategorySchema), async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const body = c.get('body') as unknown as ReturnType<
    typeof createCategorySchema.parse
  >;
  const now = nowISO();

  const base = slugify(body.name) || 'category';
  let code = base;

  const [existing] = await db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .where(
      and(
        eq(schema.categories.userId, user.id),
        eq(schema.categories.code, code),
      ),
    );
  if (existing) {
    code = `${base}_${generateId().slice(0, 8)}`;
  }

  const [created] = await db
    .insert(schema.categories)
    .values({
      id: generateId(),
      userId: user.id,
      code,
      name: body.name,
      groupName: body.groupName ?? null,
      kind: body.kind,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return c.json(serializeCategory(created), 201);
});
