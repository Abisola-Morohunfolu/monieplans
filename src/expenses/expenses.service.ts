import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gte, ilike, isNull, lte, or } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as fs from 'fs';
import { DRIZZLE } from '../database/database.provider';
import * as schema from '../database/schema';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ListExpensesDto } from './dto/list-expenses.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>) {
    if (!fs.existsSync('./uploads/receipts')) {
      fs.mkdirSync('./uploads/receipts', { recursive: true });
    }
  }

  async create(userId: string, dto: CreateExpenseDto) {
    return this.db.transaction(async (tx) => {
      // 1. Resolve active budget period
      const budgetPeriod = await tx
        .select()
        .from(schema.budgetPeriods)
        .where(
          and(
            eq(schema.budgetPeriods.userId, userId),
            eq(schema.budgetPeriods.status, 'active'),
          ),
        )
        .orderBy(desc(schema.budgetPeriods.periodStartDate))
        .limit(1)
        .then((res) => res[0]);

      if (!budgetPeriod) {
        throw new BadRequestException('No active budget period found. Please activate a budget period first.');
      }

      // 2. Resolve weekly allocation matching the expense date
      const week = await tx
        .select()
        .from(schema.weeklyBudgetAllocations)
        .where(
          and(
            eq(schema.weeklyBudgetAllocations.budgetPeriodId, budgetPeriod.id),
            lte(schema.weeklyBudgetAllocations.weekStartDate, dto.expenseDate),
            gte(schema.weeklyBudgetAllocations.weekEndDate, dto.expenseDate),
          ),
        )
        .limit(1)
        .then((res) => res[0]);

      const weeklyBudgetAllocationId = week ? week.id : null;

      // 3. Validate category if provided
      if (dto.categoryId) {
        const [cat] = await tx
          .select()
          .from(schema.categories)
          .where(
            and(
              eq(schema.categories.id, dto.categoryId),
              or(isNull(schema.categories.userId), eq(schema.categories.userId, userId)),
            ),
          );
        if (!cat) {
          throw new NotFoundException('Category not found');
        }
      }

      // 4. Validate receipt if provided
      let finalMerchantName = dto.merchantName;
      let sourceType: 'manual' | 'receipt_upload' = 'manual';

      if (dto.receiptId) {
        const [receipt] = await tx
          .select()
          .from(schema.expenseEntryReceipts)
          .where(
            and(
              eq(schema.expenseEntryReceipts.id, dto.receiptId),
              eq(schema.expenseEntryReceipts.userId, userId),
              isNull(schema.expenseEntryReceipts.deletedAt),
            ),
          );

        if (!receipt) {
          throw new NotFoundException('Receipt not found');
        }

        sourceType = 'receipt_upload';
        if (!finalMerchantName && receipt.parsedMerchantName) {
          finalMerchantName = receipt.parsedMerchantName;
        }
      }

      // 5. Insert expense entry
      const [expense] = await tx
        .insert(schema.expenseEntries)
        .values({
          userId,
          budgetPeriodId: budgetPeriod.id,
          weeklyBudgetAllocationId,
          categoryId: dto.categoryId,
          amount: dto.amount.toString(),
          expenseDate: dto.expenseDate,
          description: dto.description,
          sourceType,
          merchantName: finalMerchantName,
          receiptParseStatus: dto.receiptId ? 'confirmed' : 'not_applicable',
        })
        .returning();

      // 6. Update receipt mapping if present
      if (dto.receiptId) {
        await tx
          .update(schema.expenseEntryReceipts)
          .set({
            expenseEntryId: expense.id,
            parseStatus: 'confirmed',
          })
          .where(eq(schema.expenseEntryReceipts.id, dto.receiptId));
      }

      // 7. Sync cache for weekly allocation
      if (weeklyBudgetAllocationId) {
        await this.recalculateWeeklyCache(tx, weeklyBudgetAllocationId);
      }

      return expense;
    });
  }

  async findAll(userId: string, dto: ListExpensesDto) {
    const conditions = [
      eq(schema.expenseEntries.userId, userId),
      isNull(schema.expenseEntries.deletedAt),
    ];

    if (dto.budgetPeriodId) {
      conditions.push(eq(schema.expenseEntries.budgetPeriodId, dto.budgetPeriodId));
    }
    if (dto.weeklyBudgetAllocationId) {
      conditions.push(eq(schema.expenseEntries.weeklyBudgetAllocationId, dto.weeklyBudgetAllocationId));
    }
    if (dto.categoryId) {
      conditions.push(eq(schema.expenseEntries.categoryId, dto.categoryId));
    }
    if (dto.startDate) {
      conditions.push(gte(schema.expenseEntries.expenseDate, dto.startDate));
    }
    if (dto.endDate) {
      conditions.push(lte(schema.expenseEntries.expenseDate, dto.endDate));
    }
    if (dto.sourceType) {
      conditions.push(eq(schema.expenseEntries.sourceType, dto.sourceType));
    }
    if (dto.search) {
      conditions.push(
        or(
          ilike(schema.expenseEntries.description, `%${dto.search}%`),
          ilike(schema.expenseEntries.merchantName, `%${dto.search}%`),
        ) as any,
      );
    }

    return this.db
      .select({
        id: schema.expenseEntries.id,
        userId: schema.expenseEntries.userId,
        budgetPeriodId: schema.expenseEntries.budgetPeriodId,
        weeklyBudgetAllocationId: schema.expenseEntries.weeklyBudgetAllocationId,
        categoryId: schema.expenseEntries.categoryId,
        categoryName: schema.categories.name,
        categoryCode: schema.categories.code,
        amount: schema.expenseEntries.amount,
        expenseDate: schema.expenseEntries.expenseDate,
        description: schema.expenseEntries.description,
        sourceType: schema.expenseEntries.sourceType,
        merchantName: schema.expenseEntries.merchantName,
        receiptParseConfidence: schema.expenseEntries.receiptParseConfidence,
        receiptParseStatus: schema.expenseEntries.receiptParseStatus,
        createdAt: schema.expenseEntries.createdAt,
        updatedAt: schema.expenseEntries.updatedAt,
      })
      .from(schema.expenseEntries)
      .leftJoin(schema.categories, eq(schema.expenseEntries.categoryId, schema.categories.id))
      .where(and(...conditions))
      .orderBy(desc(schema.expenseEntries.expenseDate), desc(schema.expenseEntries.createdAt));
  }

  async findOne(userId: string, id: string) {
    const [expense] = await this.db
      .select({
        id: schema.expenseEntries.id,
        userId: schema.expenseEntries.userId,
        budgetPeriodId: schema.expenseEntries.budgetPeriodId,
        weeklyBudgetAllocationId: schema.expenseEntries.weeklyBudgetAllocationId,
        categoryId: schema.expenseEntries.categoryId,
        categoryName: schema.categories.name,
        categoryCode: schema.categories.code,
        amount: schema.expenseEntries.amount,
        expenseDate: schema.expenseEntries.expenseDate,
        description: schema.expenseEntries.description,
        sourceType: schema.expenseEntries.sourceType,
        merchantName: schema.expenseEntries.merchantName,
        receiptParseConfidence: schema.expenseEntries.receiptParseConfidence,
        receiptParseStatus: schema.expenseEntries.receiptParseStatus,
        createdAt: schema.expenseEntries.createdAt,
        updatedAt: schema.expenseEntries.updatedAt,
      })
      .from(schema.expenseEntries)
      .leftJoin(schema.categories, eq(schema.expenseEntries.categoryId, schema.categories.id))
      .where(
        and(
          eq(schema.expenseEntries.id, id),
          eq(schema.expenseEntries.userId, userId),
          isNull(schema.expenseEntries.deletedAt),
        ),
      );

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    return expense;
  }

  async update(userId: string, id: string, dto: UpdateExpenseDto) {
    const expense = await this.findOne(userId, id);

    return this.db.transaction(async (tx) => {
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (dto.amount !== undefined) {
        updateData.amount = dto.amount.toString();
      }
      if (dto.description !== undefined) {
        updateData.description = dto.description;
      }
      if (dto.merchantName !== undefined) {
        updateData.merchantName = dto.merchantName;
      }
      if (dto.categoryId !== undefined) {
        if (dto.categoryId) {
          const [cat] = await tx
            .select()
            .from(schema.categories)
            .where(
              and(
                eq(schema.categories.id, dto.categoryId),
                or(isNull(schema.categories.userId), eq(schema.categories.userId, userId)),
              ),
            );
          if (!cat) {
            throw new NotFoundException('Category not found');
          }
        }
        updateData.categoryId = dto.categoryId;
      }

      const oldWeekId = expense.weeklyBudgetAllocationId;
      let newWeekId = expense.weeklyBudgetAllocationId;

      if (dto.expenseDate !== undefined) {
        updateData.expenseDate = dto.expenseDate;
        const [week] = await tx
          .select()
          .from(schema.weeklyBudgetAllocations)
          .where(
            and(
              eq(schema.weeklyBudgetAllocations.budgetPeriodId, expense.budgetPeriodId),
              lte(schema.weeklyBudgetAllocations.weekStartDate, dto.expenseDate),
              gte(schema.weeklyBudgetAllocations.weekEndDate, dto.expenseDate),
            ),
          )
          .limit(1);

        newWeekId = week ? week.id : null;
        updateData.weeklyBudgetAllocationId = newWeekId;
      }

      const [updated] = await tx
        .update(schema.expenseEntries)
        .set(updateData)
        .where(eq(schema.expenseEntries.id, id))
        .returning();

      if (oldWeekId) {
        await this.recalculateWeeklyCache(tx, oldWeekId);
      }
      if (newWeekId && newWeekId !== oldWeekId) {
        await this.recalculateWeeklyCache(tx, newWeekId);
      }

      return updated;
    });
  }

  async remove(userId: string, id: string) {
    const expense = await this.findOne(userId, id);

    return this.db.transaction(async (tx) => {
      const [deleted] = await tx
        .update(schema.expenseEntries)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.expenseEntries.id, id))
        .returning();

      if (expense.weeklyBudgetAllocationId) {
        await this.recalculateWeeklyCache(tx, expense.weeklyBudgetAllocationId);
      }

      await tx
        .update(schema.expenseEntryReceipts)
        .set({ deletedAt: new Date() })
        .where(eq(schema.expenseEntryReceipts.expenseEntryId, id));

      return deleted;
    });
  }

  async uploadReceipt(userId: string, file: any) {
    const [receipt] = await this.db
      .insert(schema.expenseEntryReceipts)
      .values({
        userId,
        fileName: file.originalname,
        storagePath: file.path,
        parseStatus: 'processing',
        isActive: true,
      })
      .returning();

    this.simulateReceiptParsing(receipt.id, file.originalname);

    return receipt;
  }

  async getReceipt(userId: string, id: string) {
    const [receipt] = await this.db
      .select()
      .from(schema.expenseEntryReceipts)
      .where(
        and(
          eq(schema.expenseEntryReceipts.id, id),
          eq(schema.expenseEntryReceipts.userId, userId),
          isNull(schema.expenseEntryReceipts.deletedAt),
        ),
      );

    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }
    return receipt;
  }

  async recalculateWeeklyCache(tx: any, weekId: string) {
    const [week] = await tx
      .select()
      .from(schema.weeklyBudgetAllocations)
      .where(eq(schema.weeklyBudgetAllocations.id, weekId));

    if (!week) return;

    const expenses = await tx
      .select({ amount: schema.expenseEntries.amount })
      .from(schema.expenseEntries)
      .where(
        and(
          eq(schema.expenseEntries.weeklyBudgetAllocationId, weekId),
          isNull(schema.expenseEntries.deletedAt),
        ),
      );

    const totalSpent = expenses.reduce((sum: number, exp: { amount: string }) => sum + parseFloat(exp.amount), 0);
    const finalPlannedAmount = parseFloat(week.finalPlannedAmount);
    const remainingAmount = finalPlannedAmount - totalSpent;

    await tx
      .update(schema.weeklyBudgetAllocations)
      .set({
        actualSpentAmountCache: totalSpent.toFixed(2),
        remainingAmountCache: remainingAmount.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(schema.weeklyBudgetAllocations.id, weekId));
  }

  private simulateReceiptParsing(receiptId: string, originalName: string) {
    setTimeout(async () => {
      try {
        let parsedAmount = 1500;
        const fileNumbers = originalName.match(/\d+/g);
        if (fileNumbers && fileNumbers.length > 0) {
          const matchedNum = parseFloat(fileNumbers[0]);
          if (!isNaN(matchedNum) && matchedNum > 0) {
            parsedAmount = matchedNum;
          }
        } else {
          parsedAmount = Math.round((500 + Math.random() * 9500) * 100) / 100;
        }

        const merchants = ['Starbucks', 'Uber', 'Walmart', 'Amazon', 'Shell', 'Target', 'McDonalds'];
        const parsedMerchantName = merchants[Math.floor(Math.random() * merchants.length)];
        const parsedExpenseDate = new Date().toISOString().split('T')[0];

        await this.db
          .update(schema.expenseEntryReceipts)
          .set({
            parseStatus: 'parsed',
            parsedAmount: parsedAmount.toFixed(2),
            parsedMerchantName,
            parsedExpenseDate,
            rawParserOutputJson: JSON.stringify({
              confidence: 95,
              extractedAt: new Date().toISOString(),
              mockParser: 'Antigravity Mock OCR',
              suggestedCategory: 'uncategorized',
            }),
            processedAt: new Date(),
          })
          .where(eq(schema.expenseEntryReceipts.id, receiptId));
      } catch (err) {
        console.error('Error during mock receipt parsing:', err);
        try {
          await this.db
            .update(schema.expenseEntryReceipts)
            .set({
              parseStatus: 'failed',
            })
            .where(eq(schema.expenseEntryReceipts.id, receiptId));
        } catch (updateErr) {
          console.error('Failed to mark receipt status as failed:', updateErr);
        }
      }
    }, 3000);
  }
}
