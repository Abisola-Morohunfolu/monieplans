export const queryKeys = {
  transactions: {
    all: ['transactions'] as const,
    list: (params?: unknown) => ['transactions', 'list', params] as const,
  },
  budgets: {
    month: (month: string) => ['budgets', 'month', month] as const,
    summary: (month: string) => ['budgets', 'month', month, 'summary'] as const,
  },
  categories: {
    all: ['categories'] as const,
    search: (term: string) => ['categories', 'search', term] as const,
  },
  user: {
    profile: ['user', 'profile'] as const,
    me: ['user', 'me'] as const,
    session: ['user', 'session'] as const,
  },
} as const
