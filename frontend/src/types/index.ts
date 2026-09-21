export interface PaginationMeta {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface Paginated<T> {
  data: T[]
  pagination: PaginationMeta
}

export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  currency: string
  occurredOn: string
  categoryId: string | null
  categoryName: string | null
  categoryCode: string | null
  payee: string | null
  note: string | null
  source: string
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  code: string
  name: string
  groupName: string | null
  kind: 'income' | 'expense'
  isSystem: boolean
}

export interface Budget {
  id: string
  month: string
  currency: string
  status: 'draft' | 'active'
  createdAt: string
  updatedAt: string
}

export interface CategoryBudget {
  categoryId: string
  assigned: number
}

export interface CategorySummary extends Category {
  assigned: number
  activity: number
  available: number
}

export interface BudgetTotals {
  totalAssigned: number
  totalIncome: number
  totalExpense: number
  unassigned: number
}

export interface BudgetSummary extends Budget {
  categories: CategorySummary[]
  totals: BudgetTotals
}

export interface TransactionListParams {
  month?: string
  categoryId?: string
  type?: TransactionType
  search?: string
  limit?: number
  offset?: number
}

export interface CreateTransactionInput {
  type: TransactionType
  amount: number
  occurredOn: string
  categoryId?: string | null
  payee?: string | null
  note?: string | null
}

export type UpdateTransactionInput = Partial<CreateTransactionInput>

export interface CreateCategoryInput {
  name: string
  groupName?: string
  kind?: 'income' | 'expense'
}

export interface SetAssignmentsInput {
  assignments: { categoryId: string; assigned: number }[]
}

export interface User {
  id: string
  email: string
  name: string
}

export interface UserProfile {
  userId: string
  email: string
  name: string
  profileId: string
  fullName: string | null
  preferredCurrency: string
  timezone: string | null
  createdAt: string
  updatedAt: string
}
