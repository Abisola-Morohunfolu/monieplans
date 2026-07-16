import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalsService } from './goals.service';

@UseGuards(AuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateGoalDto) {
    return this.goalsService.create(userId, dto);
  }

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.goalsService.findAll(userId);
  }

  @Get('reservations/:budgetPeriodId')
  getReservations(
    @CurrentUser('id') userId: string,
    @Param('budgetPeriodId') budgetPeriodId: string,
  ) {
    return this.goalsService.getReservationsForPeriod(userId, budgetPeriodId);
  }

  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.goalsService.findOne(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.goalsService.update(userId, id, dto);
  }

  @Delete(':id')
  archive(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.goalsService.archive(userId, id);
  }

  @Post('reserve/:budgetPeriodId')
  reserveInBudget(
    @CurrentUser('id') userId: string,
    @Param('budgetPeriodId') budgetPeriodId: string,
  ) {
    return this.goalsService.reserveInBudget(userId, budgetPeriodId);
  }
}
