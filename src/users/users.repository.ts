import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/database.provider';
import * as schema from '../database/schema';

@Injectable()
export class UsersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>) {}

  async findProfileByUserId(userId: string) {
    const [profile] = await this.db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.userId, userId));
    return profile;
  }

  async createProfile(userId: string) {
    const [created] = await this.db
      .insert(schema.userProfiles)
      .values({ userId })
      .returning();
    return created;
  }

  async upsertProfile(values: typeof schema.userProfiles.$inferInsert, setValues: Partial<typeof schema.userProfiles.$inferInsert>) {
    const [updated] = await this.db
      .insert(schema.userProfiles)
      .values(values)
      .onConflictDoUpdate({
        target: schema.userProfiles.userId,
        set: setValues,
      })
      .returning();
    return updated;
  }
}
