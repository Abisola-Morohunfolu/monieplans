import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { BudgetModule } from './budget/budget.module';
import { CategoriesModule } from './categories/categories.module';
import { DatabaseModule } from './database/database.module';
import { ExpensesModule } from './expenses/expenses.module';
import { FixedExpensesModule } from './fixed-expenses/fixed-expenses.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    BudgetModule,
    CategoriesModule,
    ExpensesModule,
    FixedExpensesModule,
  ],
})
export class AppModule {}
