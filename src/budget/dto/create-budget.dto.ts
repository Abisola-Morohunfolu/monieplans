import { IsBoolean, IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateBudgetDto {
  @IsDateString()
  periodStartDate: string;

  @IsDateString()
  periodEndDate: string;

  @IsOptional()
  @IsIn(['calendar_month', 'custom_30_day', 'custom_31_day'])
  cycleType?: string;

  @IsOptional()
  @IsString()
  presetMonth?: string;

  @IsIn(['income_based', 'spending_cap_based'])
  planningMode: 'income_based' | 'spending_cap_based';

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyIncomeAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyBudgetCapAmount?: number;

  @IsNotEmpty()
  @IsString()
  currency: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  activateImmediately?: boolean;
}
