import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BudgetService } from './budget.service';
import { CreateBudgetDto } from './dto/create-budget.dto';

@Controller('budgets')
@UseGuards(AuthGuard)
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateBudgetDto) {
    return this.budgetService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.budgetService.findAll(user.id);
  }

  @Get('active')
  findActive(@CurrentUser() user: { id: string }) {
    return this.budgetService.findActive(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.budgetService.findOne(user.id, id);
  }

  @Post(':id/activate')
  activate(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.budgetService.activate(user.id, id);
  }

  @Post(':id/lock')
  lock(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.budgetService.lock(user.id, id);
  }
}
