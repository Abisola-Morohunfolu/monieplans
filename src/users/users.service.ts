import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UpdateProfileDto } from './dto/update-profile.dto';

type BudgetCycleType = 'calendar_month' | 'custom_30_day' | 'custom_31_day';
type WeekStartDay = 'monday' | 'sunday' | 'saturday';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getProfile(userId: string) {
    const profile = await this.usersRepository.findProfileByUserId(userId);

    if (!profile) {
      return this.usersRepository.createProfile(userId);
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

    return this.usersRepository.upsertProfile(values, setValues);
  }
}
