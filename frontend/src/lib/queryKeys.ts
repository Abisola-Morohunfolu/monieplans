export const queryKeys = {
  budgets: {
    all: ['budgets'] as const,
    detail: (id: string) => ['budgets', id] as const,
    active: ['budgets', 'active'] as const,
    periods: (budgetId: string) => ['budgets', budgetId, 'periods'] as const,
    allocations: (id: string) => ['budgets', id, 'allocations'] as const,
    summary: (id: string) => ['budgets', id, 'summary'] as const,
  },
  expenses: {
    all: ['expenses'] as const,
    detail: (id: string) => ['expenses', id] as const,
    list: (params?: unknown) => ['expenses', 'list', params] as const,
  },
  income: {
    all: ['income'] as const,
    list: (params?: unknown) => ['income', 'list', params] as const,
  },
  goals: {
    all: ['goals'] as const,
    detail: (id: string) => ['goals', id] as const,
    reservations: (budgetPeriodId: string) => ['goals', 'reservations', budgetPeriodId] as const,
  },
  fixedExpenses: {
    all: ['fixed-expenses'] as const,
    templates: ['fixed-expenses', 'templates'] as const,
    templateDetail: (id: string) => ['fixed-expenses', 'templates', id] as const,
  },
  statements: {
    all: ['statements'] as const,
    detail: (id: string) => ['statements', id] as const,
    transactions: (id: string) => ['statements', id, 'transactions'] as const,
    allTransactions: (params?: unknown) => ['statements', 'transactions', params] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    recommendations: ['analytics', 'recommendations'] as const,
  },
  user: {
    profile: ['user', 'profile'] as const,
    me: ['user', 'me'] as const,
    session: ['user', 'session'] as const,
  },
  categories: {
    all: ['categories'] as const,
    search: (term: string) => ['categories', 'search', term] as const,
  },
  receipts: {
    all: ['receipts'] as const,
    items: (receiptId: string) => ['receipts', receiptId, 'items'] as const,
  },
} as const
