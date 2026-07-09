import { PartialType } from '@nestjs/mapped-types';
import { CreateFixedExpenseTemplateDto } from './create-fixed-expense-template.dto';

export class UpdateFixedExpenseTemplateDto extends PartialType(CreateFixedExpenseTemplateDto) {}
