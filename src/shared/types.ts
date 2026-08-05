import type * as schema from '../database/schema';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

declare module 'hono' {
  interface ContextVariableMap {
    user: {
      id: string;
      email: string;
      name: string;
      emailVerified: boolean;
      image?: string | null;
    };
    session: { id: string };
    db: DrizzleD1Database<typeof schema>;
    auth: {
      handler: (req: Request) => Promise<Response>;
      api: {
        getSession: (opts: { headers: Headers }) => Promise<{
          user: {
            id: string;
            email: string;
            name: string;
            emailVerified: boolean;
            image?: string | null;
          };
          session: { id: string };
        } | null>;
      };
    };
    body: Record<string, unknown>;
    query: Record<string, unknown>;
  }
}
