import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { ConfigService } from '@nestjs/config';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE');

export const drizzleProvider = {
  provide: DRIZZLE,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const pool = new Pool({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
    });
    return drizzle(pool, { schema });
  },
};
