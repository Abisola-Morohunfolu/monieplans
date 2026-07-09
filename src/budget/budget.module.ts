import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';
import { BudgetRepository } from './budget.repository';

@Module({
  imports: [AuthModule],
  controllers: [BudgetController],
  providers: [BudgetService, BudgetRepository],
  exports: [BudgetService, BudgetRepository],
})
export class BudgetModule {}
