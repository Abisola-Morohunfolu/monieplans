import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/database/schema/index.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/monieplans.sqlite',
  },
});
