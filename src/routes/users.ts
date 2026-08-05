import { Hono } from 'hono';
import { generateId, nowISO, toCents, fromCents } from '../shared/utils';
import { updateProfileSchema } from '../shared/schemas';
import { validateJson } from '../shared/validate';
import { eq } from 'drizzle-orm';
import * as schema from '../database/schema';

export const usersRouter = new Hono();

usersRouter.get('/me', async (c) => {
  const user = c.get('user');
  return c.json({ id: user.id, email: user.email, name: user.name });
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
    const pid = generateId();
    const [created] = await db
      .insert(schema.userProfiles)
      .values({ id: pid, userId: user.id, createdAt: now, updatedAt: now })
      .returning();
    const { id: _createdId, userId: _createdUserId, ...createdRest } = created;
    return c.json({
      userId: user.id,
      email: user.email,
      name: user.name,
      profileId: created.id,
      ...createdRest,
    });
  }

  const { id: _profileId, userId: _profileUserId, ...profileRest } = profile;
  return c.json({
    userId: user.id,
    email: user.email,
    name: user.name,
    profileId: profile.id,
    ...profileRest,
  });
});

usersRouter.patch('/me/profile', validateJson(updateProfileSchema), async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const body = c.get('body') as unknown as ReturnType<typeof updateProfileSchema.parse>;
  const now = nowISO();

  const values = {
    userId: user.id,
    fullName: body.fullName,
    preferredCurrency: body.preferredCurrency,
    timezone: body.timezone,
    budgetCycleAnchorDay: body.budgetCycleAnchorDay,
    defaultBudgetCycleType: body.defaultBudgetCycleType,
    weekStartDay: body.weekStartDay,
  };

  const setValues = {
    fullName: body.fullName,
    preferredCurrency: body.preferredCurrency,
    timezone: body.timezone,
    budgetCycleAnchorDay: body.budgetCycleAnchorDay,
    defaultBudgetCycleType: body.defaultBudgetCycleType,
    weekStartDay: body.weekStartDay,
    updatedAt: now,
  };

  const [profile] = await db
    .insert(schema.userProfiles)
    .values({ id: generateId(), ...values, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: schema.userProfiles.userId,
      set: setValues,
    })
    .returning();

  return c.json(profile);
});
