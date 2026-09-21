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

## Stage 2 — backend routes + serializers/schemas (BE-*) — DONE

- [x] `routes/transactions.ts` — CRUD, list/filter (month/category/type/search), soft delete.
- [x] `routes/budgets.ts` — month budget upsert (`PUT /:month`), assignments
      (`PUT /:month/assignments`), summary (`GET /:month/summary`) with derived
      assigned/activity/available + `unassigned` hint.
- [x] `routes/categories.ts` — list + custom category create.
- [x] `routes/users.ts` — slim profile (`preferredCurrency`, `timezone`, `fullName`).
- [x] Removed: expenses, income, fixed-expenses, goals, statements, analytics routes;
      queue consumers; `lib/extract.ts` + `lib/categorize.ts`.
- [x] Rewrote serializers + zod schemas; slimmed `index.ts` wiring, helpers, `Env`.
- [x] `yarn typecheck` green.

## Stage 3 — frontend (FE-*) — DONE

- [x] Types rewritten to v1 model (`Transaction`, `Budget` (month), `CategoryBudget`,
      `BudgetSummary`, inputs).
- [x] Query keys rewritten (`transactions`, `budgets.month/summary`, `categories`).
- [x] Hooks: `useTransactions` (create/update/delete); `useBudget`/`useBudgetSummary`/
      `useSetAssignments` month-based; `useCategories` (+ create). Removed old hooks.
- [x] Components: `TransactionFormModal` (type toggle, kind-filtered category select);
      removed old form modals + `StatementImportTab`.
- [x] Routes: single budget page (month nav + inline assignment), `transactions` ledger,
      `dashboard` → redirect to `/budgets`, slim `onboarding` (currency only), slim
      `profile`; removed expenses/fixed-expenses/goals routes.
- [x] Nav (`AppLayout`): Budget / Transactions / Settings.
- [x] Mobile: bottom tab bar (mobile) + sidebar (desktop), bottom-sheet modal,
      `viewport-fit=cover`, safe-area padding, 16px inputs (iOS zoom fix).
- [x] `npm run build` + `npm run lint` green.

## Stage 4 — infra cleanup (INFRA-*) — DONE

- [x] Removed `r2_buckets` + `queues` from `wrangler.jsonc` (kept D1, vars,
      `send_email`, observability).
- [x] Removed `@llamaindex/llama-cloud` from `package.json` (pruned `yarn.lock`).
- [x] Removed `LLAMA_CLOUD_API_KEY` from `.env.example`.
- [x] `yarn typecheck` + `yarn test` + `yarn lint` green; grep confirms no
      llama/R2/queue refs outside docs/diagrams.

## Stage 5 — tests + docs (TEST-*, DOC-*) — DONE

- [x] `api.test.ts` rewritten — health/root smoke + 401 for all auth-gated routes
      (`app.request` with `{ app }` named export). 48 vitest tests green.
- [x] e2e: `auth.setup.ts` seed rewritten to v1 API (`PUT /api/budgets/:month`,
      `POST /api/transactions`); removed `expenses`/`fixed-expenses`/`goals` specs;
      added `transactions.spec.ts`; rewrote `budgets`/`dashboard`/`navigation`;
      kept `profile`/`auth.no-auth`.
- [x] Docs: superseded banner on `BACKEND_SPEC.md` + `FRONTEND_SPEC.md`;
      `README.md` rewritten to Hono/Workers/D1.
- [x] Diagrams: `data-model.mmd` + `data-flow.mmd` regenerated to v1 target;
      re-exported `data-model.svg` + `data-flow.svg` (Kroki).

## Decisions (locked)

- Migration strategy: fresh empty DB (single 0000 migration, auth tables included).
- Rollover: reset each month. Income: transaction + derived `unassigned` hint.
- Categories: grouped by `group_name`; system kinds limited to `income|expense`.
- Mobile nav: bottom tab bar (Budget / Transactions / Settings) on mobile, sidebar on desktop.

## ⚠️ Remaining red/deferred

- (none) — v1 rewrite complete. v1.5 (recurring txns, goals as category targets,
  rollover) and v2 (imports + AI) deferred per PRD §7.
