CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` text,
	`refresh_token_expires_at` text,
	`scope` text,
	`password` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` text NOT NULL,
	`token` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer NOT NULL,
	`image` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`full_name` text,
	`preferred_currency` text DEFAULT 'NGN' NOT NULL,
	`timezone` text DEFAULT 'Africa/Lagos' NOT NULL,
	`budget_cycle_anchor_day` integer DEFAULT 1,
	`default_budget_cycle_type` text DEFAULT 'calendar_month' NOT NULL,
	`week_start_day` text DEFAULT 'monday' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_profiles_user_id_unique` ON `user_profiles` (`user_id`);--> statement-breakpoint
CREATE TABLE `budget_periods` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`period_start_date` text NOT NULL,
	`period_end_date` text NOT NULL,
	`cycle_type` text DEFAULT 'calendar_month' NOT NULL,
	`preset_month` text,
	`planning_mode` text DEFAULT 'income_based' NOT NULL,
	`monthly_income_amount_cents` integer,
	`monthly_budget_cap_amount_cents` integer,
	`currency` text DEFAULT 'NGN' NOT NULL,
	`notes` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`locked_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_budget_periods_user_date` ON `budget_periods` (`user_id`,`period_start_date`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`group_name` text,
	`kind` text DEFAULT 'expense' NOT NULL,
	`is_system` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_categories_user_code` ON `categories` (`user_id`,`code`);--> statement-breakpoint
CREATE TABLE `fixed_expense_items` (
	`id` text PRIMARY KEY NOT NULL,
	`budget_period_id` text NOT NULL,
	`user_id` text NOT NULL,
	`fixed_expense_template_id` text,
	`name` text NOT NULL,
	`category_id` text,
	`amount_cents` integer NOT NULL,
	`due_date` text,
	`origin_type` text DEFAULT 'one_off' NOT NULL,
	`inclusion_status` text DEFAULT 'included' NOT NULL,
	`is_mandatory` integer DEFAULT false NOT NULL,
	`is_protected_from_cut_recommendations` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`budget_period_id`) REFERENCES `budget_periods`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fixed_expense_template_id`) REFERENCES `fixed_expense_templates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `fixed_expense_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`category_id` text,
	`amount_cents` integer NOT NULL,
	`cadence` text DEFAULT 'every_period' NOT NULL,
	`default_due_day` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`is_mandatory` integer DEFAULT false NOT NULL,
	`is_protected_from_cut_recommendations` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `weekly_budget_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`budget_period_id` text NOT NULL,
	`user_id` text NOT NULL,
	`week_index` integer NOT NULL,
	`week_start_date` text NOT NULL,
	`week_end_date` text NOT NULL,
	`allocation_strategy` text DEFAULT 'equal_split' NOT NULL,
	`planned_amount_cents` integer NOT NULL,
	`adjustment_amount_cents` integer DEFAULT 0 NOT NULL,
	`final_planned_amount_cents` integer NOT NULL,
	`actual_spent_amount_cents_cache` integer,
	`remaining_amount_cents_cache` integer,
	`status` text DEFAULT 'upcoming' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`budget_period_id`) REFERENCES `budget_periods`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_weekly_alloc_period_week` ON `weekly_budget_allocations` (`budget_period_id`,`week_index`);--> statement-breakpoint
CREATE TABLE `statement_uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`budget_period_id` text,
	`file_name` text NOT NULL,
	`file_type` text NOT NULL,
	`storage_path` text NOT NULL,
	`upload_status` text DEFAULT 'uploaded' NOT NULL,
	`statement_period_start` text,
	`statement_period_end` text,
	`parse_error_summary` text,
	`uploaded_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`processed_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`budget_period_id`) REFERENCES `budget_periods`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transaction_category_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`match_type` text NOT NULL,
	`match_value` text NOT NULL,
	`category_id` text NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`created_from_transaction_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_from_transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`statement_upload_id` text,
	`budget_period_id` text,
	`posted_date` text NOT NULL,
	`description_raw` text NOT NULL,
	`description_normalized` text,
	`amount_cents` integer NOT NULL,
	`currency` text DEFAULT 'NGN' NOT NULL,
	`direction` text NOT NULL,
	`merchant_name` text,
	`category_id` text,
	`category_confidence` integer,
	`is_user_corrected` integer DEFAULT false NOT NULL,
	`is_excluded_from_analysis` integer DEFAULT false NOT NULL,
	`external_hash` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`statement_upload_id`) REFERENCES `statement_uploads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`budget_period_id`) REFERENCES `budget_periods`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `goal_budget_reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`budget_period_id` text NOT NULL,
	`goal_id` text NOT NULL,
	`reserved_amount_cents` integer NOT NULL,
	`recommended_amount_cents` integer,
	`feasibility_status` text DEFAULT 'on_track' NOT NULL,
	`feasibility_reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`budget_period_id`) REFERENCES `budget_periods`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`goal_id`) REFERENCES `savings_goals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_goal_reservations_period_goal` ON `goal_budget_reservations` (`budget_period_id`,`goal_id`);--> statement-breakpoint
CREATE TABLE `savings_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`target_amount_cents` integer NOT NULL,
	`current_saved_amount_cents` integer DEFAULT 0 NOT NULL,
	`target_date` text,
	`priority_rank` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`reserve_in_budget` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `expense_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`budget_period_id` text NOT NULL,
	`weekly_budget_allocation_id` text,
	`category_id` text,
	`amount_cents` integer NOT NULL,
	`expense_date` text NOT NULL,
	`description` text,
	`source_type` text DEFAULT 'manual' NOT NULL,
	`merchant_name` text,
	`receipt_parse_confidence` integer,
	`receipt_parse_status` text DEFAULT 'not_applicable' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`budget_period_id`) REFERENCES `budget_periods`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`weekly_budget_allocation_id`) REFERENCES `weekly_budget_allocations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `expense_entry_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expense_entry_id` text,
	`file_name` text NOT NULL,
	`storage_path` text NOT NULL,
	`parse_status` text DEFAULT 'uploaded' NOT NULL,
	`parsed_amount_cents` integer,
	`parsed_expense_date` text,
	`parsed_merchant_name` text,
	`raw_parser_output_json` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`processed_at` text,
	`deleted_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`expense_entry_id`) REFERENCES `expense_entries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`event_type` text NOT NULL,
	`actor_type` text DEFAULT 'user' NOT NULL,
	`change_summary_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `recommendation_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`budget_period_id` text,
	`recommendation_type` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`estimated_monthly_impact_cents` integer,
	`evidence_json` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`budget_period_id`) REFERENCES `budget_periods`(`id`) ON UPDATE no action ON DELETE no action
);
