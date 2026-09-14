import { describe, it, expect } from 'vitest';
import { categorizeDebit } from './categorize';
import type { ParsedTransaction } from './extract';
import type { CategorizeResult } from './categorize';

function makeTxn(
  overrides: Partial<ParsedTransaction> = {},
): ParsedTransaction {
  return {
    date: '2026-01-01',
    description: 'Test transaction',
    amount: 100,
    direction: 'debit',
    channel: null,
    reference: null,
    transactionType: 'other',
    merchantName: null,
    isInternalBookkeeping: false,
    parentReference: null,
    ...overrides,
  };
}

const categories = [
  { id: 'cat-food', code: 'food' },
  { id: 'cat-bills', code: 'bills' },
  { id: 'cat-transfer', code: 'transfer' },
  { id: 'cat-savings', code: 'savings' },
] as Parameters<typeof categorizeDebit>[2];

function run(
  txn: ParsedTransaction,
  rules: Parameters<typeof categorizeDebit>[1] = [],
): CategorizeResult {
  return categorizeDebit(txn, rules, categories);
}

describe('categorizeDebit', () => {
  it('matches a learned merchant rule with highest confidence', () => {
    const txn = makeTxn({
      merchantName: 'Shoprite',
      description: 'Shoprite purchase',
    });
    const result = run(txn, [
      {
        matchType: 'merchant',
        matchValue: 'shoprite',
        categoryId: 'cat-food',
      } as never,
    ]);
    expect(result).toEqual({
      categoryId: 'cat-food',
      confidence: 100,
      matchedBy: 'rule',
    });
  });

  it('falls back to transaction type mapping', () => {
    const txn = makeTxn({
      transactionType: 'bank_charge',
      description: 'Monthly account fee',
    });
    const result = run(txn);
    expect(result).toEqual({
      categoryId: 'cat-bills',
      confidence: 90,
      matchedBy: 'type',
    });
  });

  it('falls back to keyword matching', () => {
    const txn = makeTxn({
      description: 'Dinner at a restaurant',
      transactionType: 'card_payment',
    });
    const result = run(txn);
    expect(result).toEqual({
      categoryId: 'cat-food',
      confidence: 70,
      matchedBy: 'keyword',
    });
  });

  it('returns null when nothing matches', () => {
    const txn = makeTxn({ description: 'xyzzy', transactionType: 'other' });
    const result = run(txn);
    expect(result).toEqual({
      categoryId: null,
      confidence: null,
      matchedBy: null,
    });
  });

  it('prioritizes learned rule over type and keyword', () => {
    const txn = makeTxn({
      transactionType: 'bank_charge',
      merchantName: 'Shoprite',
      description: 'Shoprite groceries',
    });
    const result = run(txn, [
      {
        matchType: 'merchant',
        matchValue: 'shoprite',
        categoryId: 'cat-food',
      } as never,
    ]);
    expect(result.categoryId).toBe('cat-food');
    expect(result.matchedBy).toBe('rule');
  });
});
