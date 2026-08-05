import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../database/schema';

let cached: { auth: unknown; db: ReturnType<typeof drizzle<typeof schema>> } | null = null;

const trustedOrigins = ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'];

export function getAuth(dbBinding: D1Database) {
  if (cached) return cached;
  const db = drizzle(dbBinding, { schema });
  const auth = betterAuth({
    database: drizzleAdapter(db, { provider: 'sqlite' }) as never,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    trustedOrigins,
  }) as unknown;
  cached = { auth, db };
  return cached! as { auth: unknown; db: typeof db };
}
