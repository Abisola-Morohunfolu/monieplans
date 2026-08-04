import { Injectable, Logger } from '@nestjs/common';
import { StatementsRepository } from './statements.repository';
import * as fs from 'fs';
import csv = require('csv-parser');

@Injectable()
export class StatementsService {
  private readonly logger = new Logger(StatementsService.name);

  constructor(private readonly statementsRepository: StatementsRepository) {}

  async handleFileUpload(
    userId: string,
    file: Express.Multer.File,
    budgetPeriodId?: string,
  ) {
    const upload = await this.statementsRepository.createStatementUpload({
      userId,
      budgetPeriodId,
      fileName: file.originalname,
      fileType: file.mimetype,
      storagePath: file.path,
      uploadStatus: 'uploaded',
    });

    // Start processing asynchronously
    this.processStatement(upload.id, file.path, userId, budgetPeriodId).catch((err) => {
      this.logger.error(`Error processing statement ${upload.id}`, err.stack);
    });

    return upload;
  }

  private async processStatement(
    uploadId: string,
    filePath: string,
    userId: string,
    budgetPeriodId?: string,
  ) {
    try {
      await this.statementsRepository.updateStatementUpload(uploadId, {
        uploadStatus: 'processing',
      });

      const records = await this.parseCsv(filePath);
      
      const rules = await this.statementsRepository.getTransactionCategoryRules(userId);
      
      const transactions = records.map((record) => {
        // Fallbacks for different CSV header casings
        const rawAmount = record.Amount || record.amount || '0';
        const amount = parseFloat(rawAmount.replace(/,/g, ''));
        const description = record.Description || record.description || '';
        const dateStr = record.Date || record.date;
        
        let direction: 'debit' | 'credit' = amount < 0 ? 'debit' : 'credit';
        if (record.Direction || record.direction) {
           direction = (record.Direction || record.direction).toLowerCase() === 'credit' ? 'credit' : 'debit';
        }

        let categoryId = null;
        for (const rule of rules) {
          if (rule.matchType === 'exact_text' && description === rule.matchValue) {
            categoryId = rule.categoryId;
            break;
          }
          if (rule.matchType === 'contains_text' && description.toLowerCase().includes(rule.matchValue.toLowerCase())) {
            categoryId = rule.categoryId;
            break;
          }
        }

        return {
          userId,
          statementUploadId: uploadId,
          budgetPeriodId,
          postedDate: dateStr ? new Date(dateStr).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          descriptionRaw: description,
          descriptionNormalized: description.trim().toLowerCase(),
          amount: Math.abs(amount).toString(),
          direction,
          categoryId,
        };
      });

      await this.statementsRepository.createTransactions(transactions);

      await this.statementsRepository.updateStatementUpload(uploadId, {
        uploadStatus: 'processed',
        processedAt: new Date(),
      });
    } catch (error: any) {
      await this.statementsRepository.updateStatementUpload(uploadId, {
        uploadStatus: 'failed',
        parseErrorSummary: error.message,
      });
      throw error;
    }
  }

  private parseCsv(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data: any) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error: Error) => reject(error));
    });
  }

  async getTransactions(statementUploadId: string) {
    return this.statementsRepository.getTransactions(statementUploadId);
  }
}
