import { describe, it, expect } from 'vitest';
import {
  createCategorySchema,
  updateProfileSchema,
  createTransactionSchema,
  updateTransactionSchema,
  listTransactionsQuerySchema,
  setAssignmentsSchema,
  monthParamSchema,
} from './schemas';

describe('Zod schemas', () => {
  describe('monthParamSchema', () => {
    it('accepts YYYY-MM', () => {
      expect(() => monthParamSchema.parse('2026-08')).not.toThrow();
    });

    it('rejects invalid formats', () => {
      expect(() => monthParamSchema.parse('2026-8')).toThrow();
      expect(() => monthParamSchema.parse('26-08')).toThrow();
      expect(() => monthParamSchema.parse('2026-13')).toThrow();
      expect(() => monthParamSchema.parse('2026-08-01')).toThrow();
    });
  });

  describe('createCategorySchema', () => {
    it('accepts valid category', () => {
      const result = createCategorySchema.parse({
        name: 'Pets',
        kind: 'expense',
      });
      expect(result.name).toBe('Pets');
      expect(result.kind).toBe('expense');
    });

    it('defaults kind to expense', () => {
      expect(createCategorySchema.parse({ name: 'Pets' }).kind).toBe('expense');
    });

    it('rejects empty name', () => {
      expect(() => createCategorySchema.parse({ name: '  ' })).toThrow();
    });

    it('rejects invalid kind', () => {
      expect(() =>
        createCategorySchema.parse({ name: 'Pets', kind: 'savings' }),
      ).toThrow();
    });
  });

  describe('updateProfileSchema', () => {
    it('allows partial update', () => {
      expect(updateProfileSchema.parse({ preferredCurrency: 'USD' })).toEqual({
        preferredCurrency: 'USD',
      });
    });

    it('allows empty object', () => {
      expect(() => updateProfileSchema.parse({})).not.toThrow();
    });
  });

  describe('createTransactionSchema', () => {
    const valid = {
      type: 'expense' as const,
      amount: 10.5,
      occurredOn: '2026-08-01',
    };

    it('accepts valid input', () => {
      expect(() => createTransactionSchema.parse(valid)).not.toThrow();
    });

    it('rejects non-positive amount', () => {
      expect(() =>
        createTransactionSchema.parse({ ...valid, amount: 0 }),
      ).toThrow();
      expect(() =>
        createTransactionSchema.parse({ ...valid, amount: -5 }),
      ).toThrow();
    });

    it('rejects invalid type', () => {
      expect(() =>
        createTransactionSchema.parse({ ...valid, type: 'transfer' }),
      ).toThrow();
    });

    it('rejects invalid date', () => {
      expect(() =>
        createTransactionSchema.parse({ ...valid, occurredOn: '01-08-2026' }),
      ).toThrow();
    });
  });

  describe('updateTransactionSchema', () => {
    it('allows partial update', () => {
      expect(updateTransactionSchema.parse({ amount: 200 })).toEqual({
        amount: 200,
      });
    });

    it('allows empty object', () => {
      expect(() => updateTransactionSchema.parse({})).not.toThrow();
    });
  });

  describe('listTransactionsQuerySchema', () => {
    it('accepts filters', () => {
      expect(() =>
        listTransactionsQuerySchema.parse({
          month: '2026-08',
          type: 'expense',
        }),
      ).not.toThrow();
    });

    it('rejects invalid month', () => {
      expect(() =>
        listTransactionsQuerySchema.parse({ month: 'bad' }),
      ).toThrow();
    });

    it('rejects invalid type', () => {
      expect(() =>
        listTransactionsQuerySchema.parse({ type: 'nope' }),
      ).toThrow();
    });
  });

  describe('setAssignmentsSchema', () => {
    it('accepts valid assignments', () => {
      const result = setAssignmentsSchema.parse({
        assignments: [
          { categoryId: 'a', assigned: 1000 },
          { categoryId: 'b', assigned: 0 },
        ],
      });
      expect(result.assignments).toHaveLength(2);
    });

    it('rejects negative assigned', () => {
      expect(() =>
        setAssignmentsSchema.parse({
          assignments: [{ categoryId: 'a', assigned: -1 }],
        }),
      ).toThrow();
    });
  });
});
