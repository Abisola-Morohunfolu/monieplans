import { Controller, Get, Param, Patch, Body, UseGuards, Post } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('analytics')
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('recommendations')
  async getRecommendations(@CurrentUser() user: any) {
    return this.analyticsService.getRecommendations(user.id);
  }

  @Patch('recommendations/:id/status')
  async updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('status') status: 'dismissed' | 'accepted',
  ) {
    return this.analyticsService.updateRecommendationStatus(id, user.id, status);
  }

  @Post('generate-insights')
  async triggerInsights(@CurrentUser() user: any, @Body('budgetPeriodId') budgetPeriodId: string) {
    return this.analyticsService.generateInsights(user.id, budgetPeriodId);
  }
}
