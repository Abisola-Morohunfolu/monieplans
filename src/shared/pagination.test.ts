import { describe, it, expect } from 'vitest';
import { paginated, resolveLimitOffset, MAX_LIMIT } from './pagination';
import { paginationQuerySchema } from './schemas';

describe('paginationQuerySchema', () => {
  it('coerces string query params to numbers', () => {
    const result = paginationQuerySchema.parse({ limit: '10', offset: '20' });
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(20);
  });

  it('defaults to undefined when absent', () => {
    expect(paginationQuerySchema.parse({})).toEqual({});
  });

  it('rejects invalid limit', () => {
    expect(() => paginationQuerySchema.parse({ limit: '0' })).toThrow();
    expect(() => paginationQuerySchema.parse({ limit: 'abc' })).toThrow();
  });

  it('rejects negative offset', () => {
    expect(() => paginationQuerySchema.parse({ offset: '-1' })).toThrow();
  });
});

describe('resolveLimitOffset', () => {
  it('applies defaults', () => {
    expect(resolveLimitOffset({})).toEqual({ limit: 50, offset: 0 });
  });

  it('clamps limit to MAX_LIMIT', () => {
    expect(resolveLimitOffset({ limit: 1000 }).limit).toBe(MAX_LIMIT);
  });

  it('clamps negative offset to 0', () => {
    expect(resolveLimitOffset({ offset: -5 }).offset).toBe(0);
  });
});

describe('paginated', () => {
  it('computes hasMore when more records exist', () => {
    const result = paginated([1, 2, 3], 10, 3, 0);
    expect(result.pagination).toEqual({
      total: 10,
      limit: 3,
      offset: 0,
      hasMore: true,
    });
  });

  it('hasMore is false on the last page', () => {
    const result = paginated([1, 2, 3], 10, 3, 7);
    expect(result.pagination.hasMore).toBe(false);
  });

  it('preserves data', () => {
    const result = paginated([{ id: 'a' }], 1, 50, 0);
    expect(result.data).toEqual([{ id: 'a' }]);
  });
});
