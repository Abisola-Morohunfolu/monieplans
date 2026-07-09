import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import { ExpensesRepository } from './expenses.repository';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ListExpensesDto } from './dto/list-expenses.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly expensesRepository: ExpensesRepository) {
    if (!fs.existsSync('./uploads/receipts')) {
      fs.mkdirSync('./uploads/receipts', { recursive: true });
    }
  }

  async create(userId: string, dto: CreateExpenseDto) {
    return this.expensesRepository.transaction(async (tx) => {
      // 1. Resolve active budget period
      const budgetPeriod = await this.expensesRepository.getActiveBudgetPeriod(userId, tx);

      if (!budgetPeriod) {
        throw new BadRequestException('No active budget period found. Please activate a budget period first.');
      }

      // 2. Resolve weekly allocation matching the expense date
      const week = await this.expensesRepository.getWeeklyAllocationForDate(budgetPeriod.id, dto.expenseDate, tx);
      const weeklyBudgetAllocationId = week ? week.id : null;

      // 3. Validate category if provided
      if (dto.categoryId) {
        const cat = await this.expensesRepository.getCategoryByIdAndUser(dto.categoryId, userId, tx);
        if (!cat) {
          throw new NotFoundException('Category not found');
        }
      }

      // 4. Validate receipt if provided
      let finalMerchantName = dto.merchantName;
      let sourceType: 'manual' | 'receipt_upload' = 'manual';

      if (dto.receiptId) {
        const receipt = await this.expensesRepository.getReceiptByIdAndUser(dto.receiptId, userId, tx);
        if (!receipt) {
          throw new NotFoundException('Receipt not found');
        }

        sourceType = 'receipt_upload';
        if (!finalMerchantName && receipt.parsedMerchantName) {
          finalMerchantName = receipt.parsedMerchantName;
        }
      }

      // 5. Insert expense entry
      const expense = await this.expensesRepository.createExpenseEntry(
        {
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
        },
        tx
      );

      // 6. Update receipt mapping if present
      if (dto.receiptId) {
        await this.expensesRepository.updateReceipt(
          dto.receiptId,
          {
            expenseEntryId: expense.id,
            parseStatus: 'confirmed',
          },
          tx
        );
      }

      // 7. Sync cache for weekly allocation
      if (weeklyBudgetAllocationId) {
        await this.recalculateWeeklyCache(tx, weeklyBudgetAllocationId);
      }

      return expense;
    });
  }

  async findAll(userId: string, dto: ListExpensesDto) {
    return this.expensesRepository.findAllExpenses(userId, dto);
  }

  async findOne(userId: string, id: string) {
    const expense = await this.expensesRepository.findOneExpense(userId, id);
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    return expense;
  }

  async update(userId: string, id: string, dto: UpdateExpenseDto) {
    const expense = await this.findOne(userId, id);

    return this.expensesRepository.transaction(async (tx) => {
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
          const cat = await this.expensesRepository.getCategoryByIdAndUser(dto.categoryId, userId, tx);
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
        const week = await this.expensesRepository.getWeeklyAllocationForDate(expense.budgetPeriodId, dto.expenseDate, tx);
        
        newWeekId = week ? week.id : null;
        updateData.weeklyBudgetAllocationId = newWeekId;
      }

      const updated = await this.expensesRepository.updateExpenseEntry(id, updateData, tx);

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

    return this.expensesRepository.transaction(async (tx) => {
      const deleted = await this.expensesRepository.updateExpenseEntry(
        id,
        { deletedAt: new Date(), updatedAt: new Date() },
        tx
      );

      if (expense.weeklyBudgetAllocationId) {
        await this.recalculateWeeklyCache(tx, expense.weeklyBudgetAllocationId);
      }

      await this.expensesRepository.softDeleteReceiptsByExpenseId(id, tx);

      return deleted;
    });
  }

  async uploadReceipt(userId: string, file: any) {
    const receipt = await this.expensesRepository.createReceipt({
      userId,
      fileName: file.originalname,
      storagePath: file.path,
      parseStatus: 'processing',
      isActive: true,
    });

    this.simulateReceiptParsing(receipt.id, file.originalname);

    return receipt;
  }

  async getReceipt(userId: string, id: string) {
    const receipt = await this.expensesRepository.getReceiptByIdAndUser(id, userId);
    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }
    return receipt;
  }

  async recalculateWeeklyCache(tx: any, weekId: string) {
    const week = await this.expensesRepository.getWeeklyAllocation(weekId, tx);
    if (!week) return;

    const expenses = await this.expensesRepository.getWeeklyAllocationExpenses(weekId, tx);

    const totalSpent = expenses.reduce((sum: number, exp: { amount: string }) => sum + parseFloat(exp.amount), 0);
    const finalPlannedAmount = parseFloat(week.finalPlannedAmount);
    const remainingAmount = finalPlannedAmount - totalSpent;

    await this.expensesRepository.updateWeeklyAllocation(
      weekId,
      {
        actualSpentAmountCache: totalSpent.toFixed(2),
        remainingAmountCache: remainingAmount.toFixed(2),
        updatedAt: new Date(),
      },
      tx
    );
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

        await this.expensesRepository.updateReceipt(receiptId, {
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
        });
      } catch (err) {
        console.error('Error during mock receipt parsing:', err);
        try {
          await this.expensesRepository.updateReceipt(receiptId, {
            parseStatus: 'failed',
          });
        } catch (updateErr) {
          console.error('Failed to mark receipt status as failed:', updateErr);
        }
      }
    }, 3000);
  }
}
