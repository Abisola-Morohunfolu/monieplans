import { Inject, Injectable } from '@nestjs/common';
import { or, eq, isNull } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/database.provider';
import * as schema from '../database/schema';

@Injectable()
export class CategoriesService {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>) {}

  findAll(userId: string) {
    return this.db
      .select()
      .from(schema.categories)
      .where(
        or(isNull(schema.categories.userId), eq(schema.categories.userId, userId)),
      );
  }
}
