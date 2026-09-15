export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface Paginated<T> {
  data: T[];
  pagination: PaginationMeta;
}

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;

export function resolveLimitOffset(query: {
  limit?: number;
  offset?: number;
}): { limit: number; offset: number } {
  const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const offset = Math.max(query.offset ?? 0, 0);
  return { limit, offset };
}

export function paginated<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number,
): Paginated<T> {
  return {
    data,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + data.length < total,
    },
  };
}
