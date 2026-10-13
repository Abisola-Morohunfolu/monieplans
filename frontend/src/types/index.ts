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

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  occurredOn: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryCode: string | null;
  payee: string | null;
  note: string | null;
  paymentStatus: 'completed' | 'pending' | 'failed';
  splits?: {
    categoryId: string | null;
    amount: number;
    categoryName?: string | null;
  }[];
  evidence?: { id: string; mimeType: string; createdAt: string }[];
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  code: string;
  name: string;
  groupName: string | null;
  kind: 'income' | 'expense' | 'transfer';
  isSystem: boolean;
}

export interface Budget {
  id: string;
  month: string;
  currency: string;
  status: 'draft' | 'active';
  createdAt: string;
  updatedAt: string;
}

export interface CategoryBudget {
  categoryId: string;
  assigned: number;
}

export interface CategorySummary extends Category {
  originalTarget: number;
  pacing: 'monthly' | 'weekly';
  warning: string | null;
  assigned: number;
  activity: number;
  available: number;
}

export interface BudgetTotals {
  totalAssigned: number;
  totalIncome: number;
  totalExpense: number;
  remaining: number;
  flexibleRemaining: number;
  unassigned: number;
}

export interface BudgetSummary extends Budget {
  excludedCurrencyCount: number;
  spendingLimit: number | null;
  revision: number;
  weeklyAvailable: number | null;
  buffer: { id: string; assigned: number; available: number };
  weeks: WeekSummary[];
  currentWeek: WeekSummary;
  movements: Movement[];
  categories: CategorySummary[];
  totals: BudgetTotals;
}

export interface TransactionListParams {
  month?: string;
  categoryId?: string;
  type?: TransactionType;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateTransactionInput {
  type: TransactionType;
  amount: number;
  occurredOn: string;
  categoryId?: string | null;
  payee?: string | null;
  note?: string | null;
  currency?: string;
  paymentStatus?: 'completed' | 'pending' | 'failed';
  splits?: { categoryId: string | null; amount: number }[];
  id?: string;
}

export type UpdateTransactionInput = Partial<CreateTransactionInput>;

export interface CreateCategoryInput {
  name: string;
  groupName?: string;
  kind?: 'income' | 'expense' | 'transfer';
}

export interface SetAssignmentsInput {
  spendingLimit: number;
  revision: number;
  assignments: {
    categoryId: string;
    assigned: number;
    pacing?: string;
    weeks?: { weekStart: string; amount: number }[];
  }[];
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  profileId: string;
  fullName: string | null;
  preferredCurrency: string;
  timezone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeekSummary {
  start: string;
  end: string;
  days: number;
  current: boolean;
  plannedCents: number;
  spentCents: number;
  availableCents: number;
  buckets: {
    bucketId: string;
    plannedCents: number;
    adjustmentCents: number;
    spentCents: number;
    carryCents: number;
    availableCents: number;
  }[];
}
export interface Movement {
  id: string;
  source_id: string;
  destination_id: string;
  amount_cents: number;
  created_at: string;
}
export interface Capture {
  id: string;
  status: string;
  attempt: number;
  error: string | null;
  transactionId: string | null;
  defaultCategoryId: string | null;
  openedMonth: string | null;
  extracted: {
    amount: number | null;
    occurredOn: string | null;
    payee: string | null;
    currency: string | null;
    paymentStatus: string;
    type: string;
    suggestedCategoryId: string | null;
    confidence: string;
    warnings: string[];
  } | null;
  likelyDuplicates: {
    id: string;
    payee: string;
    amount: number;
    occurredOn: string;
  }[];
}
