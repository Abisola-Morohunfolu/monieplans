import { drizzle } from 'drizzle-orm/d1';
import { sql } from 'drizzle-orm';
import * as schema from '../src/database/schema';
import crypto from 'node:crypto';

function generateId() {
  return crypto.randomUUID();
}

const systemCategories = [
  { code: 'food', name: 'Food & Dining', groupName: 'Living', kind: 'expense' },
  { code: 'transport', name: 'Transport', groupName: 'Living', kind: 'expense' },
  { code: 'bills', name: 'Bills & Utilities', groupName: 'Fixed', kind: 'expense' },
  { code: 'housing', name: 'Housing & Rent', groupName: 'Fixed', kind: 'expense' },
  { code: 'shopping', name: 'Shopping', groupName: 'Lifestyle', kind: 'expense' },
  { code: 'health', name: 'Health & Wellness', groupName: 'Living', kind: 'expense' },
  { code: 'entertainment', name: 'Entertainment', groupName: 'Lifestyle', kind: 'expense' },
  { code: 'education', name: 'Education', groupName: 'Growth', kind: 'expense' },
  { code: 'savings', name: 'Savings', groupName: 'Goals', kind: 'savings' },
  { code: 'transfer', name: 'Transfer', groupName: 'Other', kind: 'transfer' },
  { code: 'uncategorized', name: 'Uncategorized', groupName: 'Other', kind: 'expense' },
];

export async function seed(db: ReturnType<typeof drizzle>) {
  for (const cat of systemCategories) {
    const now = new Date().toISOString();
    await db
      .insert(schema.categories)
      .values({
        id: generateId(),
        ...cat,
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();
  }
}

if (import.meta.main) {
  console.error('Seed should be run via: wrangler d1 execute DB --local --command="...');
  console.error('Or programmatically in a migration script.');
}
