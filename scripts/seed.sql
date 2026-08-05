-- Seed 11 system categories for D1
INSERT OR IGNORE INTO categories (id, name, code, group_name, kind, is_system, is_active, created_at, updated_at)
VALUES
  (hex(randomblob(16)), 'Food & Dining', 'food', 'Living', 'expense', 1, 1, datetime('now'), datetime('now')),
  (hex(randomblob(16)), 'Transport', 'transport', 'Living', 'expense', 1, 1, datetime('now'), datetime('now')),
  (hex(randomblob(16)), 'Bills & Utilities', 'bills', 'Fixed', 'expense', 1, 1, datetime('now'), datetime('now')),
  (hex(randomblob(16)), 'Housing & Rent', 'housing', 'Fixed', 'expense', 1, 1, datetime('now'), datetime('now')),
  (hex(randomblob(16)), 'Shopping', 'shopping', 'Lifestyle', 'expense', 1, 1, datetime('now'), datetime('now')),
  (hex(randomblob(16)), 'Health & Wellness', 'health', 'Living', 'expense', 1, 1, datetime('now'), datetime('now')),
  (hex(randomblob(16)), 'Entertainment', 'entertainment', 'Lifestyle', 'expense', 1, 1, datetime('now'), datetime('now')),
  (hex(randomblob(16)), 'Education', 'education', 'Growth', 'expense', 1, 1, datetime('now'), datetime('now')),
  (hex(randomblob(16)), 'Savings', 'savings', 'Goals', 'savings', 1, 1, datetime('now'), datetime('now')),
  (hex(randomblob(16)), 'Transfer', 'transfer', 'Other', 'transfer', 1, 1, datetime('now'), datetime('now')),
  (hex(randomblob(16)), 'Uncategorized', 'uncategorized', 'Other', 'expense', 1, 1, datetime('now'), datetime('now'));
