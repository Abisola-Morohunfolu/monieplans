import { Module } from '@nestjs/common';
import { StatementsController } from './statements.controller';
import { StatementsService } from './statements.service';
import { StatementsRepository } from './statements.repository';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [StatementsController],
  providers: [StatementsService, StatementsRepository],
  exports: [StatementsService],
})
export class StatementsModule {}
