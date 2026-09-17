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

export interface Budget {
  id: string
  name: string
  status: 'draft' | 'active' | 'locked'
  cycle: 'weekly'
  cycleType: string
  periodStartDate: string
  periodEndDate: string
  presetMonth: string | null
  cap: number
  income: number
  planningMode: string
  currency?: string
  notes?: string | null
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

export interface WeeklyAllocation {
  id: string
  budgetPeriodId: string
  weekIndex: number
  weekStartDate: string
  weekEndDate: string
  allocationStrategy: string
  plannedAmount: number
  finalPlannedAmount: number
  actualSpent: number
  remaining: number
  status: 'upcoming' | 'current' | 'completed'
}

export interface CategoryTotal {
  categoryId: string | null
  categoryName: string | null
  categoryCode: string | null
  amount: number
}

export interface BudgetSummary extends Budget {
  cap: number
  incomeTotal: number
  spent: number
  remaining: number
  categoryTotals: CategoryTotal[]
  weeklyAllocations: WeeklyAllocation[]
  fixedExpensesTotal?: number
  fixedExpenseItems?: FixedExpenseItem[]
}

export interface Expense {
  id: string
  amount?: number
  description: string | null
  categoryId: string | null
  categoryName?: string | null
  categoryCode?: string | null
  budgetPeriodId: string
  weeklyBudgetAllocationId?: string | null
  expenseDate: string
  date?: string
  sourceType?: string
  merchantName?: string | null
  receiptParseConfidence?: number | null
  receiptParseStatus?: string
  createdAt: string
  updatedAt?: string
}

export interface ExpenseParams {
  search?: string
  categoryId?: string
  budgetPeriodId?: string
  startDate?: string
  endDate?: string
  sourceType?: string
  limit?: number
  offset?: number
}

export interface IncomeEntry {
  id: string
  amount?: number
  description: string | null
  categoryId: string | null
  categoryName?: string | null
  budgetPeriodId: string
  transactionId?: string | null
  incomeDate: string
  date?: string
  sourceType?: string
  createdAt: string
  updatedAt?: string
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string | null
  status: 'active' | 'completed' | 'archived'
  priorityRank: number
  reserveInBudget: boolean
  notes: string | null
  createdAt: string
  updatedAt?: string
}

export interface FixedExpenseTemplate {
  id: string
  name: string
  amount: number
  categoryId: string | null
  categoryName?: string | null
  frequency: string
  dueDay?: number
  createdAt: string
  updatedAt?: string
}

export interface FixedExpenseItem {
  id: string
  budgetPeriodId: string
  fixedExpenseTemplateId: string | null
  name: string
  categoryId: string | null
  categoryName?: string | null
  amount: number
  dueDate: string | null
  originType: string
  inclusionStatus: string
  isMandatory: boolean
  isProtectedFromCutRecommendations: boolean
  notes: string | null
  createdAt: string
  updatedAt?: string
}

export interface StatementUpload {
  id: string
  fileName: string
  uploadStatus: string
  statementPeriodStart?: string | null
  statementPeriodEnd?: string | null
  transactionCount?: number
  status?: string
  createdAt?: string
  uploadedAt?: string
  processedAt?: string | null
}

export interface StatementTransaction {
  id: string
  statementUploadId: string | null
  amount?: number
  descriptionRaw: string
  description?: string
  descriptionNormalized?: string | null
  postedDate: string
  date?: string
  direction: string
  currency?: string
  merchantName?: string | null
  transactionType?: string | null
  isInternalBookkeeping?: boolean
  parentTransactionId?: string | null
  categoryId?: string | null
  categoryName?: string | null
  isUserCorrected?: boolean
  isExcludedFromAnalysis?: boolean
  convertedToExpenseId?: string | null
  convertedToIncomeId?: string | null
  createdAt: string
  updatedAt?: string
}

export interface Category {
  id: string
  code: string
  name: string
  groupName: string | null
  kind: string
  isSystem: boolean
}

export interface Receipt {
  id: string
  userId: string
  expenseEntryId?: string | null
  fileName: string
  storagePath: string
  receiptType: string
  parseStatus: string
  parsedAmountCents?: number | null
  parsedExpenseDate?: string | null
  parsedMerchantName?: string | null
  isActive: boolean
  createdAt: string
  processedAt?: string | null
}

export interface ReceiptLineItem {
  id: string
  receiptId: string
  name: string
  quantity: number
  unitPriceCents?: number | null
  totalPriceCents: number
  categoryId?: string | null
  status: string
  createdAt: string
  updatedAt?: string
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
  preferredCurrency?: string
  timezone?: string | null
  weekStartDay?: string | null
}

export interface AnalyticsRecommendation {
  id: string
  title: string
  body: string
  description?: string
  status: 'active' | 'dismissed' | 'accepted'
  createdAt: string
}

export interface AnalyticsInsights {
  totalSpent: number
  budgetRemaining: number
  topCategory: string
  recommendations: AnalyticsRecommendation[]
}

export interface CreateBudgetInput {
  periodStartDate: string
  periodEndDate: string
  planningMode: 'income_based' | 'spending_cap_based'
  cycleType?: string
  monthlyIncomeAmount?: number
  monthlyBudgetCapAmount?: number
  currency?: string
  notes?: string
  activateImmediately?: boolean
}

export interface CreateExpenseInput {
  amount: number
  expenseDate: string
  categoryId?: string
  description?: string
  merchantName?: string
}

export interface CreateGoalInput {
  name: string
  targetAmount: number
  targetDate?: string
  priorityRank?: number
  reserveInBudget?: boolean
  notes?: string
}

export interface CreateFixedExpenseInput {
  name: string
  amount: number
  categoryId?: string
  cadence?: string
  defaultDueDay?: number
  notes?: string
}

export interface CreateIncomeInput {
  amount: number
  incomeDate: string
  categoryId?: string
  description?: string
}
