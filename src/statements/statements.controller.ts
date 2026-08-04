import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  UseGuards,
  Get,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { StatementsService } from './statements.service';
import { UploadStatementDto } from './dto/upload-statement.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('statements')
@UseGuards(AuthGuard)
export class StatementsController {
  constructor(private readonly statementsService: StatementsService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/statements',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `statement-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async uploadStatement(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadStatementDto,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.statementsService.handleFileUpload(user.id, file, dto.budgetPeriodId);
  }

  @Get(':id/transactions')
  async getTransactions(@Param('id') uploadId: string) {
    return this.statementsService.getTransactions(uploadId);
  }
}
