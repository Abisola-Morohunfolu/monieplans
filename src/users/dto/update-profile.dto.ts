import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  preferredCurrency?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  budgetCycleAnchorDay?: number;

  @IsOptional()
  @IsIn(['calendar_month', 'custom_30_day', 'custom_31_day'])
  defaultBudgetCycleType?: string;

  @IsOptional()
  @IsIn(['monday', 'sunday', 'saturday'])
  weekStartDay?: string;
}
