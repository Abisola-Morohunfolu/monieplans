# Progress — PRD v1 rewrite (big-bang, staged)

> Tracking the PRD rewrite. See `.agent/REWORK_PLAN.md` for the full change inventory
> (stable IDs DB-*, BE-*, FE-*, INFRA-*, TEST-*, DOC-*).

## Stages

1. schema + migration (DB-*)
2. backend routes + serializers/schemas (BE-*)
3. frontend hooks/components/routes (FE-*)
4. infra cleanup + dead-code removal (INFRA-*)
5. tests + docs (TEST-*, DOC-*)

## Stage 1 — schema + migration (DB-*) — DONE

- [x] New `transactions` table (single ledger): `type{income|expense}`, `amount_cents`,
      `currency`, `occurred_on`, `category_id` (nullable), `payee`, `note`,
      `source{manual}`, `deleted_at`; index `(user_id, occurred_on)`.
- [x] New `budgets` table: `month` (YYYY-MM), `currency`, `status{draft|active}`,
      unique `(user_id, month)`.
- [x] New `category_budgets` table: `assigned_cents`, unique `(budget_id, category_id)`.
- [x] Slim `user_profiles` — dropped `budget_cycle_anchor_day`,
      `default_budget_cycle_type`, `week_start_day`.
- [x] Slim `categories` — dropped `is_active`.
- [x] Removed schema files: `budget-periods`, `expense-entries`, `income-entries`,
      `weekly-allocations`, `fixed-expenses`, `goals`, `statements`, `analytics`.
- [x] Migration reset to a single fresh `0000_fearless_genesis.sql` (fresh empty DB,
      includes auth tables). Applied + verified locally.
- [x] Seed updated: Savings/Transfer reclassified to `expense`; added system income
      categories `Salary` + `Other Income`. 13 total. Applied + verified locally.

## Stage 2 — backend routes + serializers/schemas (BE-*) — NOT STARTED

## Stage 3 — frontend (FE-*) — NOT STARTED

## Stage 4 — infra cleanup (INFRA-*) — NOT STARTED

## Stage 5 — tests + docs (TEST-*, DOC-*) — NOT STARTED

## Decisions (locked)

- Migration strategy: fresh empty DB (single 0000 migration, auth tables included).
- Rollover: reset each month. Income: transaction + derived `unassigned` hint.
- Categories: grouped by `group_name`; system kinds limited to `income|expense`.

## ⚠️ Known red state (expected mid-rewrite)

Stage 1 removed tables that ~11 backend files still import (`routes/*.ts`,
`lib/categorize.ts`, `consumers/*.ts`, `routes/helpers.ts`, `shared/types.ts`).
`yarn typecheck` is expected to FAIL until Stage 2 (BE-*) lands. Do not run
deploy/lint from here until the backend rewrite is merged in the same sequence.
