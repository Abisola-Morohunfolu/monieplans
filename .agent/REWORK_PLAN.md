# Rework Plan — change inventory (reference)

> Durable reference for the PRD rewrite (`/PRD.md`). Each item has a stable ID so
> different implementation **options** (big-bang rewrite, incremental refactor,
> fresh-DB vs in-place migration) can point at the same changes. Do **not** build
> until options are agreed.

## Scope summary

Move from the current 15-table / multi-pipeline model to the v1 model:

> `auth` + `profiles` + `categories` + **`transactions`** + `budgets` + `category_budgets`

Manual transactions only. Monthly per-category plan. Derived balances computed on
read (no caches). Imports/AI/goals/recurring deferred.

---

## DB — data model changes

| ID | Change | Current | Target |
|---|---|---|---|
| DB-1 | Reshape the ledger into one `transactions` table | `transactions` (statement-shaped) + `expense_entries` + `income_entries` | single `transactions`: `type{income\|expense}`, `amount_cents`, `currency`, `occurred_on`, `category_id`, `payee`, `note`, `source{manual}`, `deleted_at` |
| DB-2 | Drop `expense_entries`, `expense_entry_receipts`, `receipt_line_items` | `src/database/schema/expense-entries.ts` | removed |
| DB-3 | Drop `income_entries` | `src/database/schema/income-entries.ts` | removed |
| DB-4 | Drop `weekly_budget_allocations` | `src/database/schema/weekly-allocations.ts` | removed |
| DB-5 | Replace `budget_periods` with `budgets` | `src/database/schema/budget-periods.ts` | `budgets` (`month YYYY-MM`, `currency`, `status`, unique `user_id+month`) |
| DB-6 | Add `category_budgets` | — | `budget_id`, `category_id`, `assigned_cents`, unique `budget_id+category_id` |
| DB-7 | Drop `fixed_expense_templates`, `fixed_expense_items` | `src/database/schema/fixed-expenses.ts` | removed (→ recurring txns, v1.5) |
| DB-8 | Drop `savings_goals`, `goal_budget_reservations` | `src/database/schema/goals.ts` | removed (→ category targets, v1.5) |
| DB-9 | Drop `statement_uploads`, `transaction_category_rules` | `src/database/schema/statements.ts` | removed (→ import + rules, v2) |
| DB-10 | Drop `recommendation_snapshots`, `audit_events` | `src/database/schema/analytics.ts` | removed |
| DB-11 | Slim `categories` | `src/database/schema/categories.ts` | keep; `kind{income\|expense}` only |
| DB-12 | Slim `user_profiles` | `src/database/schema/users.ts` | keep `preferred_currency`, `timezone`; drop `budget_cycle_anchor_day`, `default_budget_cycle_type`, `week_start_day` |
| DB-13 | Migration(s) | `drizzle/migrations/*` | **fresh empty DB** — drop all domain tables, recreate new; no data preserved |

## BE — backend code

| ID | Change | Files |
|---|---|---|
| BE-1 | Rewrite `routes/budgets.ts` → month budget + assignments + summary | `src/routes/budgets.ts` |
| BE-2 | Add `routes/transactions.ts` (CRUD, list/filter, soft delete) | new |
| BE-3 | Remove expense route | `src/routes/expenses.ts` |
| BE-4 | Remove income route | `src/routes/income.ts` |
| BE-5 | Remove fixed-expenses route | `src/routes/fixed-expenses.ts` |
| BE-6 | Remove goals route | `src/routes/goals.ts` |
| BE-7 | Remove statements route | `src/routes/statements.ts` |
| BE-8 | Remove analytics route | `src/routes/analytics.ts` |
| BE-9 | Add POST category (custom categories) | `src/routes/categories.ts` |
| BE-10 | Simplify users/profile fields | `src/routes/users.ts` |
| BE-11 | Remove queue consumers | `src/consumers/receipt-processing.ts`, `src/consumers/statement-processing.ts` |
| BE-12 | Remove parse + categorize libs | `src/lib/extract.ts`, `src/lib/categorize.ts`, `src/lib/categorize.test.ts` |
| BE-13 | Rewrite serializers | `src/shared/serializers.ts` |
| BE-14 | Rewrite zod schemas | `src/shared/schemas.ts` (+ `schemas.test.ts`) |
| BE-15 | Update wiring: routers, queue handler, `Env` | `src/index.ts` |
| BE-16 | Update context types (drop R2/queues/LLAMA) | `src/shared/types.ts`, `src/shared/middleware.ts` |
| BE-17 | Update schema barrel | `src/database/schema/index.ts` |
| BE-18 | Update helpers (drop week-cache / findWeek / fixed-item gen) | `src/routes/helpers.ts` |

## FE — frontend

| ID | Change | Files |
|---|---|---|
| FE-1 | Rewrite types | `frontend/src/types/index.ts` |
| FE-2 | Rewrite query keys | `frontend/src/lib/queryKeys.ts` |
| FE-3 | New `useTransactions` hook | `frontend/src/hooks/` |
| FE-4 | Rewrite `useBudget` (month-based) + `useBudgets` | `frontend/src/hooks/useBudget.ts`, `useBudgets.ts` |
| FE-5 | Remove hooks: expenses, income, receipts, fixed-expenses, goals, statements, analytics | `frontend/src/hooks/*` |
| FE-6 | Add `useCategories` create/`useCategorySearch` if needed | `frontend/src/hooks/useCategories.ts` |
| FE-7 | New transaction form modal (replaces Expense/Income forms) | `frontend/src/components/transactions/` |
| FE-8 | Rewrite budget form modal (monthly) | `frontend/src/components/budgets/BudgetFormModal.tsx` |
| FE-9 | Remove: StatementImportTab, ReceiptUploadModal, ExpenseFormModal, IncomeFormModal, FixedExpenseFormModal, GoalFormModal | `frontend/src/components/*` |
| FE-10 | Rewrite routes: dashboard, budgets (index + detail), expenses→transactions | `frontend/src/routes/_authenticated/*` |
| FE-11 | Remove routes: goals, fixed-expenses, income-in-budget | `frontend/src/routes/_authenticated/*` |
| FE-12 | Simplify profile page | `frontend/src/routes/_authenticated/profile/index.tsx` |
| FE-13 | Update nav/layout links | `frontend/src/components/layout/AppLayout.tsx` |

## FE-MOBILE — responsive / mobile app

| ID | Change | Files |
|---|---|---|
| FE-M-1 | Bottom tab bar (mobile) + left sidebar (desktop) | `AppLayout.tsx` |
| FE-M-2 | Bottom-sheet modal on mobile | `components/ui/Modal.tsx` |
| FE-M-3 | `viewport-fit=cover` + safe-area padding | `index.html`, `AppLayout.tsx`, `Modal.tsx` |
| FE-M-4 | 16px inputs (iOS focus-zoom fix) | `index.css`, `components/ui/Input.tsx` |
| FE-M-5 | Touch-target pass (icon buttons ≥40px) | `Pagination.tsx`, `CategorySelect.tsx` |
| FE-M-6 | Landing/auth polish (`SectionHeading`, `StatsStrip` mobile) | `components/landing/*` |

## INFRA — config / deps

| ID | Change | Files |
|---|---|---|
| INFRA-1 | Remove R2 bucket binding | `wrangler.jsonc` |
| INFRA-2 | Remove queues (producers + consumers) | `wrangler.jsonc` |
| INFRA-3 | Remove `@llamaindex/llama-cloud` dep | `package.json`, `yarn.lock` |
| INFRA-4 | Remove `LLAMA_CLOUD_API_KEY`, R2/queue env | `.env.example`, `.dev.vars` |
| INFRA-5 | Remove queue `export default { fetch, queue }` if unused | `src/index.ts` |

## TEST

| ID | Change | Files |
|---|---|---|
| TEST-1 | Rewrite backend route tests | `src/routes/api.test.ts`, remove `categorize.test.ts` |
| TEST-2 | Rewrite e2e specs for new flow | `e2e/*` |
| TEST-3 | Keep/adjust health + shared utils/pagination tests | `src/health.test.ts`, `src/shared/*.test.ts` |

## DOC

| ID | Change | Files |
|---|---|---|
| DOC-1 | Mark stale specs removed/superseded | `BACKEND_SPEC.md`, `FRONTEND_SPEC.md` |
| DOC-2 | Update `README.md` (stack + structure) | `README.md` |
| DOC-3 | Update `AGENTS.md` (db schema, commands) | `AGENTS.md` |
| DOC-4 | Regenerate diagrams to target state | `diagrams/*` |

---

## Decisions (locked)

1. **Migration strategy** — **fresh empty DB.** Drop all domain tables, recreate new. No data preserved (pre-launch; auth tables may also reset).
2. **Execution approach** — **big-bang, staged.** Single domain rewrite in reviewable stages:
   1. schema + migration (DB-*)
   2. backend routes + serializers/schemas (BE-*)
   3. frontend hooks/components/routes (FE-*)
   4. infra cleanup + dead-code removal (INFRA-*)
   5. tests + docs (TEST-*, DOC-*)
3. **Rollover** — **reset each month.** `available = assigned − activity` for the current month only. No cross-month reads. Rollover deferred to v1.5.
4. **Income UX** — **transaction + derived hint.** Income is a normal `transaction`; budget page shows read-only `unassigned = total income − total assigned`. No distribution pool.
5. **Category groups** — **grouped.** Keep `categories.group_name`, render grouped in UI.

## Session log

- S1 (this): agreed v1 scope (no accounts, monthly per-category, manual-only). Wrote `PRD.md`. This inventory created.
- S1 (this): locked the 5 open decisions (fresh DB, staged big-bang, reset rollover, income-as-transaction + hint, grouped categories).
- S2: Stage 1 (schema + migration) + Stage 2 (backend) landed. `yarn typecheck` green.
- S3: Stage 3 (frontend) landed — v1 single-ledger UI (single budget page w/ month nav, transactions ledger, slim onboarding/profile), plus mobile bottom-tab shell (FE-M-*). `npm run build` + `npm run lint` green. Stage 4 (infra) + Stage 5 (tests/docs) remain.
