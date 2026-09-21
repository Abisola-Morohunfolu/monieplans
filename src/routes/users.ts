import { Hono } from 'hono';
import type { InferSelectModel } from 'drizzle-orm';
import { generateId, nowISO } from '../shared/utils';
import { updateProfileSchema } from '../shared/schemas';
import { validateJson } from '../shared/validate';
import { eq } from 'drizzle-orm';
import * as schema from '../database/schema';

export const usersRouter = new Hono();

function profilePayload(
  profile: InferSelectModel<typeof schema.userProfiles>,
  user: { id: string; email: string; name: string },
) {
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    profileId: profile.id,
    fullName: profile.fullName,
    preferredCurrency: profile.preferredCurrency,
    timezone: profile.timezone,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

usersRouter.get('/me', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const [profile] = await db
    .select({ preferredCurrency: schema.userProfiles.preferredCurrency })
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.userId, user.id));
  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    preferredCurrency: profile?.preferredCurrency ?? 'NGN',
  });
});

usersRouter.get('/me/profile', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const [profile] = await db
    .select()
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.userId, user.id));

  if (!profile) {
    const now = nowISO();
    const [created] = await db
      .insert(schema.userProfiles)
      .values({
        id: generateId(),
        userId: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return c.json(profilePayload(created, user));
  }

  return c.json(profilePayload(profile, user));
});

usersRouter.patch(
  '/me/profile',
  validateJson(updateProfileSchema),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const body = c.get('body') as unknown as ReturnType<
      typeof updateProfileSchema.parse
    >;
    const now = nowISO();

    if (body.fullName !== undefined) {
      await db
        .update(schema.user)
        .set({ name: body.fullName })
        .where(eq(schema.user.id, user.id));
    }

    const updateFields: {
      fullName?: string;
      preferredCurrency?: string;
      timezone?: string;
    } = {};
    if (body.fullName !== undefined) updateFields.fullName = body.fullName;
    if (body.preferredCurrency !== undefined)
      updateFields.preferredCurrency = body.preferredCurrency;
    if (body.timezone !== undefined) updateFields.timezone = body.timezone;

    const [profile] = await db
      .insert(schema.userProfiles)
      .values({
        id: generateId(),
        userId: user.id,
        ...updateFields,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: schema.userProfiles.userId,
        set: { ...updateFields, updatedAt: now },
      })
      .returning();

    return c.json(
      profilePayload(profile, { ...user, name: body.fullName ?? user.name }),
    );
  },
);
