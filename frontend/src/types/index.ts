export interface Budget {
  id: string
  name: string
  status: 'draft' | 'active' | 'locked'
  cycle: 'weekly'
  cap: number
  income: number
  planningMode: string
  createdAt: string
  updatedAt: string
}

export interface BudgetPeriod {
  id: string
  budgetId: string
  name: string
  startDate: string
  endDate: string
  status: string
}

export interface Expense {
  id: string
  amount: number
  description: string
  categoryId: string
  categoryName?: string
  budgetPeriodId: string
  date: string
  createdAt: string
  updatedAt?: string
}

export interface ExpenseParams {
  search?: string
  categoryId?: string
  budgetPeriodId?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string
  status: 'active' | 'completed' | 'archived'
  createdAt: string
  updatedAt?: string
}

export interface FixedExpenseTemplate {
  id: string
  name: string
  amount: number
  categoryId: string
  categoryName?: string
  frequency: string
  dueDay?: number
  createdAt: string
  updatedAt?: string
}

export interface StatementUpload {
  id: string
  fileName: string
  createdAt: string
  transactionCount: number
  status: string
}

export interface StatementTransaction {
  id: string
  statementUploadId: string
  amount: number
  description: string
  date: string
  categoryId?: string
  createdAt: string
}

export interface Category {
  id: string
  code: string
  name: string
  groupName: string
  kind: string
  isSystem: boolean
}

export interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

export interface UserProfile {
  name: string
  email: string
}

export interface AnalyticsRecommendation {
  id: string
  title: string
  description: string
  status: 'pending' | 'dismissed' | 'accepted'
  createdAt: string
}

export interface AnalyticsInsights {
  totalSpent: number
  budgetRemaining: number
  topCategory: string
  recommendations: AnalyticsRecommendation[]
}
