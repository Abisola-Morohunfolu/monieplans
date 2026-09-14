import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../database/schema';
import { createAuth } from './config';
import type { AuthEnv, AuthInstance } from './config';

export type { AuthEnv } from './config';

export interface AuthCache {
  auth: AuthInstance;
  db: ReturnType<typeof drizzle<typeof schema>>;
}

let cached: AuthCache | null = null;
let cachedDb: D1Database | null = null;

export function getAuth(env: AuthEnv): AuthCache {
  if (cached && cachedDb === env.DB) return cached;

  const db = drizzle(env.DB, { schema });
  const auth = createAuth(db, env);

  cached = { auth, db };
  cachedDb = env.DB;
  return cached;
}
