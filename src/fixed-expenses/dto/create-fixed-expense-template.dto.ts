import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateFixedExpenseTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsEnum(['every_period'])
  cadence?: 'every_period';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  defaultDueDay?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @IsOptional()
  @IsBoolean()
  isProtectedFromCutRecommendations?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
