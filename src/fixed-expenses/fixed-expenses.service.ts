import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/database.provider';
import * as schema from '../database/schema';
import { CreateFixedExpenseTemplateDto } from './dto/create-fixed-expense-template.dto';
import { UpdateFixedExpenseTemplateDto } from './dto/update-fixed-expense-template.dto';

@Injectable()
export class FixedExpensesService {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>) {}

  async createTemplate(userId: string, dto: CreateFixedExpenseTemplateDto) {
    if (dto.categoryId) {
      const [category] = await this.db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.id, dto.categoryId));
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    const [template] = await this.db
      .insert(schema.fixedExpenseTemplates)
      .values({
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
      })
      .returning();

    return template;
  }

  async findAllTemplates(userId: string) {
    return this.db
      .select()
      .from(schema.fixedExpenseTemplates)
      .where(eq(schema.fixedExpenseTemplates.userId, userId))
      .orderBy(desc(schema.fixedExpenseTemplates.createdAt));
  }

  async findOneTemplate(userId: string, id: string) {
    const [template] = await this.db
      .select()
      .from(schema.fixedExpenseTemplates)
      .where(and(eq(schema.fixedExpenseTemplates.userId, userId), eq(schema.fixedExpenseTemplates.id, id)));

    if (!template) {
      throw new NotFoundException('Fixed expense template not found');
    }
    return template;
  }

  async updateTemplate(userId: string, id: string, dto: UpdateFixedExpenseTemplateDto) {
    const template = await this.findOneTemplate(userId, id);

    if (dto.categoryId) {
      const [category] = await this.db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.id, dto.categoryId));
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    const [updated] = await this.db
      .update(schema.fixedExpenseTemplates)
      .set({
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
      })
      .where(eq(schema.fixedExpenseTemplates.id, id))
      .returning();

    return updated;
  }

  async deleteTemplate(userId: string, id: string) {
    await this.findOneTemplate(userId, id);
    await this.db
      .delete(schema.fixedExpenseTemplates)
      .where(and(eq(schema.fixedExpenseTemplates.userId, userId), eq(schema.fixedExpenseTemplates.id, id)));
  }

  /**
   * Generates fixed expense items for a specific budget period based on active templates.
   */
  async generateItemsForBudgetPeriod(userId: string, budgetPeriodId: string) {
    const [budgetPeriod] = await this.db
      .select()
      .from(schema.budgetPeriods)
      .where(and(eq(schema.budgetPeriods.id, budgetPeriodId), eq(schema.budgetPeriods.userId, userId)));

    if (!budgetPeriod) {
      throw new NotFoundException('Budget period not found');
    }

    const activeTemplates = await this.db
      .select()
      .from(schema.fixedExpenseTemplates)
      .where(and(eq(schema.fixedExpenseTemplates.userId, userId), eq(schema.fixedExpenseTemplates.isActive, true)));

    if (activeTemplates.length === 0) {
      return [];
    }

    return this.db.transaction(async (tx) => {
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

      return tx.insert(schema.fixedExpenseItems).values(itemsToInsert).returning();
    });
  }
}
