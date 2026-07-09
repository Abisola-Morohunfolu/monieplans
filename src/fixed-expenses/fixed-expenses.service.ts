import { Injectable, NotFoundException } from '@nestjs/common';
import { FixedExpensesRepository } from './fixed-expenses.repository';
import { CreateFixedExpenseTemplateDto } from './dto/create-fixed-expense-template.dto';
import { UpdateFixedExpenseTemplateDto } from './dto/update-fixed-expense-template.dto';

@Injectable()
export class FixedExpensesService {
  constructor(private readonly fixedExpensesRepository: FixedExpensesRepository) {}

  async createTemplate(userId: string, dto: CreateFixedExpenseTemplateDto) {
    if (dto.categoryId) {
      const category = await this.fixedExpensesRepository.findCategory(dto.categoryId);
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    const template = await this.fixedExpensesRepository.createTemplate({
      userId,
      name: dto.name,
      categoryId: dto.categoryId,
      amount: dto.amount.toString(),
      cadence: dto.cadence,
      defaultDueDay: dto.defaultDueDay,
      isActive: dto.isActive,
      isMandatory: dto.isMandatory,
      isProtectedFromCutRecommendations: dto.isProtectedFromCutRecommendations,
      notes: dto.notes,
    });

    return template;
  }

  async findAllTemplates(userId: string) {
    return this.fixedExpensesRepository.findAllTemplates(userId);
  }

  async findOneTemplate(userId: string, id: string) {
    const template = await this.fixedExpensesRepository.findOneTemplate(userId, id);
    if (!template) {
      throw new NotFoundException('Fixed expense template not found');
    }
    return template;
  }

  async updateTemplate(userId: string, id: string, dto: UpdateFixedExpenseTemplateDto) {
    await this.findOneTemplate(userId, id);

    if (dto.categoryId) {
      const category = await this.fixedExpensesRepository.findCategory(dto.categoryId);
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    const updated = await this.fixedExpensesRepository.updateTemplate(
      userId,
      id,
      {
        name: dto.name,
        categoryId: dto.categoryId,
        amount: dto.amount !== undefined ? dto.amount.toString() : undefined,
        cadence: dto.cadence,
        defaultDueDay: dto.defaultDueDay,
        isActive: dto.isActive,
        isMandatory: dto.isMandatory,
        isProtectedFromCutRecommendations: dto.isProtectedFromCutRecommendations,
        notes: dto.notes,
        updatedAt: new Date(),
      }
    );

    return updated;
  }

  async deleteTemplate(userId: string, id: string) {
    await this.findOneTemplate(userId, id);
    await this.fixedExpensesRepository.deleteTemplate(userId, id);
  }

  /**
   * Generates fixed expense items for a specific budget period based on active templates.
   */
  async generateItemsForBudgetPeriod(userId: string, budgetPeriodId: string) {
    const budgetPeriod = await this.fixedExpensesRepository.findBudgetPeriod(userId, budgetPeriodId);

    if (!budgetPeriod) {
      throw new NotFoundException('Budget period not found');
    }

    const activeTemplates = await this.fixedExpensesRepository.findActiveTemplates(userId);

    if (activeTemplates.length === 0) {
      return [];
    }

    return this.fixedExpensesRepository.transaction(async (tx) => {
      const itemsToInsert = activeTemplates.map((t) => {
        let dueDate: string | null = null;
        if (t.defaultDueDay && budgetPeriod.periodStartDate) {
          // Format the due date based on budget period start month and the template's default due day
          const d = new Date(budgetPeriod.periodStartDate);
          d.setDate(t.defaultDueDay);
          dueDate = d.toISOString().split('T')[0];
        }

        return {
          userId,
          budgetPeriodId,
          fixedExpenseTemplateId: t.id,
          name: t.name,
          categoryId: t.categoryId,
          amount: t.amount,
          dueDate,
          originType: 'recurring_template' as const,
          inclusionStatus: 'included' as const,
          isMandatory: t.isMandatory,
          isProtectedFromCutRecommendations: t.isProtectedFromCutRecommendations,
          notes: t.notes,
        };
      });

      return this.fixedExpensesRepository.insertFixedExpenseItems(itemsToInsert, tx);
    });
  }
}
