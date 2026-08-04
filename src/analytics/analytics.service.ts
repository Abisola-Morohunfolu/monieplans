import { Injectable } from '@nestjs/common';
import { AnalyticsRepository } from './analytics.repository';

@Injectable()
export class AnalyticsService {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  async getRecommendations(userId: string) {
    return this.analyticsRepository.getActiveRecommendations(userId);
  }

  async updateRecommendationStatus(id: string, userId: string, status: 'dismissed' | 'accepted') {
    return this.analyticsRepository.updateRecommendationStatus(id, userId, status);
  }

  // A cron job or manual trigger could call this to generate insights
  async generateInsights(userId: string, budgetPeriodId: string) {
    const recommendation = await this.analyticsRepository.createRecommendationSnapshot({
      userId,
      budgetPeriodId,
      recommendationType: 'reduce_category',
      title: 'High spending on Dining',
      body: 'You have spent 40% of your budget on dining. Consider reducing it to save more.',
      estimatedMonthlyImpact: '50.00',
    });

    await this.logEvent(userId, 'budget_period', budgetPeriodId, 'insight_generated');

    return recommendation;
  }

  async logEvent(userId: string, entityType: string, entityId: string, eventType: string, changeSummary?: any) {
    return this.analyticsRepository.logAuditEvent({
      userId,
      entityType,
      entityId,
      eventType,
      changeSummaryJson: changeSummary ? JSON.stringify(changeSummary) : null,
      actorType: 'system',
    });
  }
}
