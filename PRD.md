# monieplans — Product Requirements (v1 rewrite)

> Status: draft for agreement. Replaces the stale `BACKEND_SPEC.md` / `FRONTEND_SPEC.md`
> (which describe NestJS/Postgres/Render; the code is now Hono/Workers/D1).
>
> This PRD intentionally **removes** machinery from the current implementation.
> See "What we removed" for the rationale.

---

## 1. Vision

A calm, zero-based "plan your money" app. You decide what your money is for
(YNAB's "give every dollar a job"), then log transactions as they happen and
watch the plan vs. reality.

**Core loop:**

1. **Set up a plan** — a monthly budget: assign an amount to each category.
2. **Log transactions** — manually, daily or whenever, as income or expense.
3. **See where you are** — per category: `Assigned − Activity = Available`.

---

## 2. Principles

- **One transaction entity.** Manual, imported, and receipt-derived money events
  all land in the *same* table. There is no "convert an import into an entry" step.
- **No cached balances.** `Available` and totals are **computed on read**
  (`assigned − SUM(transactions)`), never stored and incrementally patched.
- **Monthly, per-category.** The plan is one budget per calendar month with
  per-category assigned amounts. No weekly splits.
- **Reset each month.** `available = assigned − activity` for the current month
  only. No carry-over of unspent amounts (rollover is a v1.5 flag).
- **Income is just a transaction.** The budget page shows a read-only
  `unassigned = total income − total assigned` hint; there is no enforced
  distribution pool.
- **Grouped categories.** Categories render grouped by `group_name`; flat order
  within each group.
- **Single currency per user.** Stored in one place (profile); every transaction
  and budget inherits it. Cents everywhere.
- **Manual first.** v1 has no bank/statement/receipt import and no AI. Imports
  are a later feature that simply becomes *another source* of transactions.

---

## 3. Data model (v1)

All IDs are strings. All money is integer **cents**. Soft-delete via `deleted_at`
where noted.

```
auth (unchanged, better-auth)
  user · session · account · verification

profiles                     1 : 1 user
  preferred_currency (default NGN), timezone

categories                    (shared; system + user-defined)
  code, name, group_name, kind {income|expense}, is_system

transactions                  ★ the core ledger
  type {income|expense}
  amount_cents, currency (denorm snapshot), occurred_on (date)
  category_id (nullable)
  payee (merchant/person), note
  source {manual}             (imports will add {statement|receipt} later)
  created_at, updated_at, deleted_at

budgets                       1 per user per month
  month (YYYY-MM), currency, status {draft|active}

category_budgets              assigned plan per category per month
  budget_id, category_id, assigned_cents
  unique (budget_id, category_id)
```

Derived values (never stored):
- `activity = SUM(transactions.amount_cents) per category per month`
- `available = assigned_cents − activity`
- `total assigned`, `total spent`, `total remaining` = sums of the above.

**Not in v1:** accounts, recurring transactions, goals, statement/receipt
imports, AI categorization rules, analytics/audit. (See phase table.)

**Migration:** fresh empty D1 database — drop all existing domain tables and
recreate. No data is preserved (pre-launch).

---

## 4. Flow

```
setup:    user → create/choose month budget → assign cents per category
logging:  user → add transaction {type, amount, date, category, payee, note}
read:     budget page → for each category: assigned vs activity vs available
```

All writes are single-table inserts/updates scoped by `user_id`. No cross-table
side effects, no batch cache updates.

---

## 5. API surface (v1)

| Method | Route | Purpose |
|---|---|---|
| `GET/PATCH` | `/api/users/me/profile` | currency, timezone |
| `GET` | `/api/categories` | system + custom categories |
| `POST` | `/api/categories` | create custom category |
| `GET/PUT` | `/api/budgets/:month` | get/upsert month budget + its category_budgets |
| `PUT` | `/api/budgets/:month/assignments` | set per-category assigned cents |
| `POST` | `/api/transactions` | log a transaction |
| `GET` | `/api/transactions` | list/filter (month, category, type, search, paginated) |
| `PATCH` | `/api/transactions/:id` | edit amount/date/category/payee/note |
| `DELETE` | `/api/transactions/:id` | soft delete |
| `GET` | `/api/budgets/:month/summary` | derived assigned/activity/available per category |

`/api/auth/*` (better-auth) unchanged.

---

## 6. What we removed vs. current code

| Removed | Why |
|---|---|
| `transactions` + `expense_entries` + `income_entries` split | 3 tables for one concept; manual "convert" step |
| `weekly_budget_allocations` + spend/remaining caches | drift-prone cache; non-standard weekly splits |
| `fixed_expense_templates` + `fixed_expense_items` | materialized per-period; becomes recurring txns in v2 |
| `goal_budget_reservations` + feasibility planner | goals become a category target in v2 |
| `budget_periods` cycleType/presetMonth/planningMode/anchorDay | 8 config fields → one `month` |
| `expense_entry_receipts` + `receipt_line_items` | receipts become an attachment + pre-fill in v2 |
| `audit_events`, `recommendation_snapshots` | unused / deferred |
| statement/receipt queues + AI (LlamaCloud) consumers | deferred to v2 |

---

## 7. Phases

| Phase | Scope |
|---|---|
| **v1 (this PRD)** | auth, profile, categories, monthly budget + per-category assignment, manual transactions, summary |
| **v1.5** | recurring transactions (bills), savings goals as category targets, category rollover |
| **v2** | statement & receipt import (one queue each, writes straight into `transactions`), AI auto-categorize + `transaction_category_rules`, analytics |
