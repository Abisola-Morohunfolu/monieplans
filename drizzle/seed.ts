import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as schema from '../src/database/schema';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const systemCategories = [
  { code: 'food', name: 'Food & Dining', groupName: 'Living', kind: 'expense' as const },
  { code: 'transport', name: 'Transport', groupName: 'Living', kind: 'expense' as const },
  { code: 'bills', name: 'Bills & Utilities', groupName: 'Fixed', kind: 'expense' as const },
  { code: 'housing', name: 'Housing & Rent', groupName: 'Fixed', kind: 'expense' as const },
  { code: 'shopping', name: 'Shopping', groupName: 'Lifestyle', kind: 'expense' as const },
  { code: 'health', name: 'Health & Wellness', groupName: 'Living', kind: 'expense' as const },
  { code: 'entertainment', name: 'Entertainment', groupName: 'Lifestyle', kind: 'expense' as const },
  { code: 'education', name: 'Education', groupName: 'Growth', kind: 'expense' as const },
  { code: 'savings', name: 'Savings', groupName: 'Goals', kind: 'savings' as const },
  { code: 'transfer', name: 'Transfer', groupName: 'Other', kind: 'transfer' as const },
  { code: 'uncategorized', name: 'Uncategorized', groupName: 'Other', kind: 'expense' as const },
];

async function seed() {
  console.log('Seeding system categories…');

  for (const cat of systemCategories) {
    await db
      .insert(schema.categories)
      .values({ ...cat, isSystem: true })
      .onConflictDoNothing();
  }

  console.log(`✓ Seeded ${systemCategories.length} system categories`);
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
