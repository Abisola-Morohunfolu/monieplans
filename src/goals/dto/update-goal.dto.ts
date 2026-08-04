import { IsEnum, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateGoalDto } from './create-goal.dto';

export class UpdateGoalDto extends PartialType(CreateGoalDto) {
  @IsEnum(['active', 'paused', 'completed', 'archived'])
  @IsOptional()
  status?: 'active' | 'paused' | 'completed' | 'archived';
}
