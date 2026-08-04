import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FixedExpensesController } from './fixed-expenses.controller';
import { FixedExpensesService } from './fixed-expenses.service';
import { FixedExpensesRepository } from './fixed-expenses.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [FixedExpensesController],
  providers: [FixedExpensesService, FixedExpensesRepository],
  exports: [FixedExpensesService, FixedExpensesRepository],
})
export class FixedExpensesModule {}
