# Monieplans

Monieplans is a mobile-first personal budget planner. A monthly spending limit is independent of income. Category buckets may be monthly-only or weekly-paced; the unallocated remainder is a buffer. Defaults are NGN, Africa/Lagos, and calendar months.

## Budget behavior

Original targets remain visible after changing allocations or moving money. Only unused allocation may move between categories or the buffer. Money moves preserve the monthly limit and have an immutable history. Monday–Sunday weeks are clipped to month boundaries and split by days with exact-cent rounding. Editable weekly schedules plus signed adjustments total the current allocation. Completed weekly schedules remain intact; source moves reduce the last future week first, then current carried availability. Destinations receive current-week credits. Weekly underspending carries forward inside the month; overruns reduce later availability. Monthly-only purchases use their reserve; excess and uncategorized spending reduce flexible availability. Actual expenses may exceed caps. Warnings apply at 80%, reached, and exceeded. Reviews also compare original targets.

## Surfaces

Home shows weekly availability, monthly remaining, attention buckets, and recent activity. Plan configures limits, buckets, pacing, buffer, and copying the previous plan. Bucket details show balances, schedules, history, and direct capture. Activity supports searching, filtering, details, editing, deletion, and private evidence. Review shows category/weekly breakdowns and optional on-demand AI recommendations.

A persistent Add expense action offers camera capture, upload, and manual entry. All buckets, including monthly-only buckets, share this flow. Bucket capture preselects its category. Image processing extracts editable amount, date, payee, currency, payment status, type, and category suggestion. The receipt date determines the spending month. Splits must total the payment. Images never create transactions automatically. Own-account transfers, failed, and pending payments do not count as completed expenses. Identical uploads reuse their capture; likely duplicates require acknowledgement or evidence attachment to the existing expense. Confirmation is idempotent. Review drafts survive failed saves and closing/reopening the capture on the same device. Manual entry remains available during processing failures. JPEG, PNG, and WebP up to 10MB are supported.

AI recommendations explain computed ledger summaries including reallocations, label incomplete months month-to-date, and propose next-month allocations. Edits make relevant recommendations stale. Applying requires an explicit preview and confirmation, including for an existing next-month plan. Original targets remain visible. Existing future-plan movements and original targets are retained; compensating signed adjustments accompany replacement pacing schedules.

## Architecture and rollout

React 19, Vite, TanStack Router/Query, Hono, Drizzle, Workers, D1, and Pages remain. D1 stores integer cents; API amounts use currency units. Private R2 stores images; Queues perform retryable extraction; a replaceable Workers AI adapter initially uses `@cf/meta/llama-4-scout-17b-16e-instruct`. Server validation treats model output as untrusted. D1 batches and a user ledger revision fence concurrent financial edits. Every financial table has revision triggers.

Apply ONLY `drizzle/migrations/0001_flexible_buckets.sql` to an existing database. Do not rerun migration 0000 or all migration scripts on existing data. Existing assignments become original targets and current caps, initially monthly-only. Their monthly spending limit stays unset until the user confirms it.

No automatic rollover, WhatsApp intake, native apps, share-sheet integration, bank synchronization, automatic item categorization, or full offline synchronization is included.

See [release setup](docs/RELEASE.md) for external resources, validation, and rollout steps.
