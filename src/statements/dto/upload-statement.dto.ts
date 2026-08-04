import { IsOptional, IsUUID } from 'class-validator';

export class UploadStatementDto {
  @IsOptional()
  @IsUUID()
  budgetPeriodId?: string;
}
