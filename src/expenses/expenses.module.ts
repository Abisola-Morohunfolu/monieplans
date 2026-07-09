import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { ExpensesRepository } from './expenses.repository';

@Module({
  imports: [AuthModule],
  controllers: [ExpensesController],
  providers: [ExpensesService, ExpensesRepository],
  exports: [ExpensesService, ExpensesRepository],
})
export class ExpensesModule {}
