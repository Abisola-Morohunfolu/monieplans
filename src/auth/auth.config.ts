import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../database/schema';
import { createAuth } from './config';
import type { AuthEnv } from './config';

const env: AuthEnv = {
  DB: undefined as unknown as D1Database,
  BETTER_AUTH_SECRET: 'cli-schema-generation-secret-0123456789',
};

const db = drizzle(undefined as unknown as D1Database, { schema });

export const auth = createAuth(db, env);
