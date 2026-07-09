import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class ListExpensesDto {
  @IsOptional()
  @IsUUID()
  budgetPeriodId?: string;

  @IsOptional()
  @IsUUID()
  weeklyBudgetAllocationId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsIn(['manual', 'receipt_upload'])
  sourceType?: 'manual' | 'receipt_upload';

  @IsOptional()
  @IsString()
  search?: string;
}
