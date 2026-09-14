import type { InferSelectModel } from 'drizzle-orm';
import type * as schema from '../database/schema';
import type { ParsedTransaction } from './extract';
import { extractFromFile } from './extract';

type Category = InferSelectModel<typeof schema.categories>;
type CategoryRule = InferSelectModel<typeof schema.transactionCategoryRules>;

export type CategorizeMatchedBy = 'rule' | 'type' | 'keyword' | 'ai' | null;

export interface CategorizeResult {
  categoryId: string | null;
  confidence: number | null;
  matchedBy: CategorizeMatchedBy;
}

const TRANSACTION_TYPE_CATEGORY: Record<string, string> = {
  transfer_out: 'transfer',
  transfer_in: 'transfer',
  bank_charge: 'bills',
  savings_movement: 'savings',
  interest: 'savings',
};

const KEYWORD_MAP: Record<string, string[]> = {
  food: [
    'restaurant',
    'uber eats',
    'domino',
    'kfc',
    'chicken republic',
    'jollof',
    'grocer',
    'supermarket',
    'supermart',
    'shoprite',
    'spar',
    'market',
    'cafe',
    'grill',
    'kitchen',
  ],
  transport: [
    'uber',
    'bolt',
    'fuel',
    'petrol',
    'transport',
    'taxi',
    'toll',
    'lagos ride',
  ],
  bills: [
    'electricity',
    'disco',
    'airtime',
    'data bundle',
    'mtn',
    'airtel',
    'glo',
    '9mobile',
    'dstv',
    'gotv',
    'netflix',
    'water',
    'internet',
    'utility',
    'subscription',
  ],
  housing: ['rent', 'mortgage', 'estate', 'property'],
  shopping: [
    'amazon',
    'jumia',
    'konga',
    'mall',
    'store',
    'boutique',
    'fashion',
  ],
  health: ['pharmacy', 'hospital', 'clinic', 'drug', 'medic', 'doctor'],
  entertainment: [
    'cinema',
    'spotify',
    'apple music',
    'youtube',
    'gaming',
    'game',
  ],
  education: [
    'school',
    'tuition',
    'book',
    'udemy',
    'coursera',
    'course',
    'exam',
  ],
};

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function matchesRule(txn: ParsedTransaction, rule: CategoryRule): boolean {
  switch (rule.matchType) {
    case 'merchant':
      return normalize(txn.merchantName) === normalize(rule.matchValue);
    case 'exact_text':
      return normalize(txn.description) === normalize(rule.matchValue);
    case 'contains_text':
      return normalize(txn.description).includes(normalize(rule.matchValue));
    default:
      return false;
  }
}

export function categorizeDebit(
  txn: ParsedTransaction,
  rules: CategoryRule[],
  categories: Category[],
): CategorizeResult {
  const categoryByCode = new Map(categories.map((c) => [c.code, c.id]));

  for (const rule of rules) {
    if (matchesRule(txn, rule)) {
      return {
        categoryId: rule.categoryId,
        confidence: 100,
        matchedBy: 'rule',
      };
    }
  }

  const typeCode = txn.transactionType
    ? TRANSACTION_TYPE_CATEGORY[txn.transactionType]
    : undefined;
  const typeCategoryId = typeCode ? categoryByCode.get(typeCode) : undefined;
  if (typeCategoryId) {
    return { categoryId: typeCategoryId, confidence: 90, matchedBy: 'type' };
  }

  const haystack = `${normalize(txn.merchantName)} ${normalize(txn.description)}`;
  for (const [code, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      const categoryId = categoryByCode.get(code);
      if (categoryId) {
        return { categoryId, confidence: 70, matchedBy: 'keyword' };
      }
    }
  }

  return { categoryId: null, confidence: null, matchedBy: null };
}

export interface AiCategorizeCandidate {
  reference: string;
  merchantName: string | null;
  description: string;
}

export async function categorizeDebitsWithAI(
  candidates: AiCategorizeCandidate[],
  categories: Category[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const categoryByCode = new Map(categories.map((c) => [c.code, c.id]));
  const allowedCodes = categories
    .filter((c) => c.kind === 'expense' && c.code !== 'uncategorized')
    .map((c) => c.code);

  if (candidates.length === 0 || allowedCodes.length === 0) {
    return result;
  }

  const schema = {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            reference: {
              type: 'string',
              description: 'The numeric index of the transaction',
            },
            categoryCode: {
              type: 'string',
              enum: allowedCodes,
              description: 'Best-fit spending category for the transaction',
            },
          },
          required: ['reference', 'categoryCode'],
        },
      },
    },
    required: ['items'],
  };

  const text = candidates
    .map((c) => `${c.reference}|${c.merchantName ?? ''}|${c.description}`)
    .join('\n');
  const buffer = new TextEncoder().encode(text).buffer;

  const extracted = await extractFromFile<{
    items: { reference: string; categoryCode: string }[];
  }>(buffer, 'categorize.txt', 'text/plain', schema, 'agentic');

  for (const item of extracted.items ?? []) {
    const categoryId = categoryByCode.get(item.categoryCode);
    if (categoryId) {
      result.set(item.reference, categoryId);
    }
  }

  return result;
}
