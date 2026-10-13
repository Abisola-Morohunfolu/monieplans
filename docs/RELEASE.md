# Flexible buckets release

## External setup before deployment

No production resources or remote migrations were changed during implementation.

1. Start from the planned fresh D1 database. After the database has been cleared and deployment is authorized, run `yarn db:migrate:remote` followed by `yarn db:seed:remote` to apply the complete schema and system categories. The migration command is only for a fresh database; it is not safe to rerun against existing tables.
2. Provision the private R2 bucket `monieplans-receipts` and Queue `monieplans-capture` in the deployment account; their names are declared in wrangler.jsonc. Leave R2 public access disabled. No browser receives an object-storage URL; evidence is streamed through an authenticated endpoint.
3. Enable Workers AI in the account and confirm access to the configured Scout model. AI calls are remote even under Wrangler dev (`ai.remote=true`); local UI/integration tests use deterministic fixtures or a local config without AI. Do not test real financial evidence remotely without the account owner's authorization.
4. Evaluate representative consented Nigerian receipts and transfer screenshots (successful, pending, failed, own-account transfers, income, blurry/missing dates, mixed categories, foreign currencies). Automated tests verify the extraction contract and safety logic; they do not establish real-model accuracy. Keep human review mandatory.
5. Deploy the Worker and Pages build only after migration/binding readiness and approval. Existing plans require the user to confirm their limit before pacing begins.

## Verification commands

Use Node 22.13+ (Node 24 recommended; SQLite integration tests use node:sqlite). `yarn test`, `yarn typecheck`, `npm run build` and `npm run lint` in frontend. After adding routes, run the installed TanStack router generator before tsc; `frontend/scripts/generate-routes.mjs` provides an ESM entry point compatible with the current pinned CLI packages. `yarn playwright test e2e/flexible-planner.spec.ts` runs local authenticated mobile flows and deterministic capture review cases. Tests use a test user and do not alter other users' data.

Backend integration tests execute the real migration/schema, SQLite transactions, Hono routes, and Drizzle lookups. They exercise rounding, calendar boundaries, carry, overspending, original targets, atomic/concurrent moves, split edits/deletion, transfers/pending exclusion, capture confirmation, duplicate uploads, evidence ownership, retries, and stale proposal handling. Remote Scout behavior and physical device camera capture remain rollout validation tasks.

## Operations

Capture Queue uses single-message batches, up to five deliveries, bounded retry delay, and generation fencing. Processing failure is visible and retryable from Activity. Queue-send failure retains the upload as a failed draft. Signed current-week adjustments preserve completed schedules. Financial mutation guards reject a stale revision with 409 and rollback the entire batch. AI errors retain the computed monthly report. Uploaded evidence is limited to 10MB and MIME signatures are validated.

Plan drafts are device-local and persisted by account and month. Switching accounts never restores another account’s draft; signing out clears cached account data while keeping each account’s own drafts. Capture review drafts are session-local by capture id. A confirmed capture always returns its original transaction even on retry. Evidence attachment does not create spending. Amounts from a foreign-currency receipt must be converted to the spending month’s plan currency before saving; exchange-rate conversion is manual in this release.

## Implemented validation

Backend Vitest: 89 passing tests; backend typecheck passes. All 22 Playwright tests pass. Browser verification covers 360/390/430px and 1440px, manual capture from monthly-only Fuel, money-move preview/confirmation, split image review with a different receipt month, failed-save draft retention, stale-plan draft recovery, native dialog focus containment/restoration, enlarged text, navigation, and existing auth/profile flows. Capture processing uses deterministic model fixtures in tests; real-model receipt accuracy and a physical phone camera still require the rollout checks above. Frontend build/lint and Worker dry-run packaging pass; non-blocking Fast Refresh warnings and the Vite chunk-size warning remain.

Currency preferences do not relabel historical records. New expenses use the receipt date's existing spending-plan currency, falling back to the account preference when there is no plan. Monthly summaries never combine currencies and visibly flag excluded foreign-currency expenses. The configured timezone determines current month and entry dates; defaults remain Africa/Lagos.

Primary API references: [Scout model](https://developers.cloudflare.com/workers-ai/models/llama-4-scout-17b-16e-instruct/), [D1 transactional batches](https://developers.cloudflare.com/d1/worker-api/d1-database/), and [Queue retries](https://developers.cloudflare.com/queues/configuration/batching-retries/).

Contrast verification: secondary/muted/error text measures at least 4.73:1 across the warm surfaces. Form boundaries measure at least 3:1.

Review regressions are covered by integration and browser tests: recommendation preview and application reject a target plan in a different currency without writes; unchanged weekly schedules preserve custom amounts and signed movements; Profile exposes keyboard-accessible sign out at phone and desktop sizes; failed sign out remains retryable; account switching in the same SPA isolates cached plans and device-local drafts. Backend ESLint still reports existing rule violations in the touched backend files; frontend lint has only the existing Fast Refresh warnings.
