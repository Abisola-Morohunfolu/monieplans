import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateFixedExpenseTemplateDto } from './dto/create-fixed-expense-template.dto';
import { UpdateFixedExpenseTemplateDto } from './dto/update-fixed-expense-template.dto';
import { FixedExpensesService } from './fixed-expenses.service';

@UseGuards(AuthGuard)
@Controller('fixed-expenses')
export class FixedExpensesController {
  constructor(private readonly fixedExpensesService: FixedExpensesService) {}

  @Post('templates')
  createTemplate(@CurrentUser('id') userId: string, @Body() dto: CreateFixedExpenseTemplateDto) {
    return this.fixedExpensesService.createTemplate(userId, dto);
  }

  @Get('templates')
  findAllTemplates(@CurrentUser('id') userId: string) {
    return this.fixedExpensesService.findAllTemplates(userId);
  }

  @Get('templates/:id')
  findOneTemplate(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.fixedExpensesService.findOneTemplate(userId, id);
  }

  @Patch('templates/:id')
  updateTemplate(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFixedExpenseTemplateDto,
  ) {
    return this.fixedExpensesService.updateTemplate(userId, id, dto);
  }

  @Delete('templates/:id')
  deleteTemplate(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.fixedExpensesService.deleteTemplate(userId, id);
  }

  @Post('generate-items/:budgetPeriodId')
  generateItemsForBudgetPeriod(
    @CurrentUser('id') userId: string,
    @Param('budgetPeriodId') budgetPeriodId: string,
  ) {
    return this.fixedExpensesService.generateItemsForBudgetPeriod(userId, budgetPeriodId);
  }
}
