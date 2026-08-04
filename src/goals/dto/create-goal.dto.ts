import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  targetAmount: number;

  @IsString()
  @IsOptional()
  targetDate?: string; // ISO date string, e.g. "2026-12-31"

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  priorityRank?: number;

  @IsBoolean()
  @IsOptional()
  reserveInBudget?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}
