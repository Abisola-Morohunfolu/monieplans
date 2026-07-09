import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/database.provider';
import * as schema from '../database/schema';
import { UpdateProfileDto } from './dto/update-profile.dto';

type BudgetCycleType = 'calendar_month' | 'custom_30_day' | 'custom_31_day';
type WeekStartDay = 'monday' | 'sunday' | 'saturday';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>) {}

  async getProfile(userId: string) {
    const [profile] = await this.db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.userId, userId));

    if (!profile) {
      const [created] = await this.db
        .insert(schema.userProfiles)
        .values({ userId })
        .returning();
      return created;
    }

    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const values = {
      userId,
      fullName: dto.fullName,
      preferredCurrency: dto.preferredCurrency,
      timezone: dto.timezone,
      budgetCycleAnchorDay: dto.budgetCycleAnchorDay,
      defaultBudgetCycleType: dto.defaultBudgetCycleType as BudgetCycleType | undefined,
      weekStartDay: dto.weekStartDay as WeekStartDay | undefined,
    };

    const setValues = {
      fullName: dto.fullName,
      preferredCurrency: dto.preferredCurrency,
      timezone: dto.timezone,
      budgetCycleAnchorDay: dto.budgetCycleAnchorDay,
      defaultBudgetCycleType: dto.defaultBudgetCycleType as BudgetCycleType | undefined,
      weekStartDay: dto.weekStartDay as WeekStartDay | undefined,
      updatedAt: new Date(),
    };

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
