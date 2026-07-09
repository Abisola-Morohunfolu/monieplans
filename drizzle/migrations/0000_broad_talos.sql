CREATE TYPE "public"."budget_cycle_type" AS ENUM('calendar_month', 'custom_30_day', 'custom_31_day');--> statement-breakpoint
CREATE TYPE "public"."week_start_day" AS ENUM('monday', 'sunday', 'saturday');--> statement-breakpoint
CREATE TYPE "public"."budget_period_status" AS ENUM('draft', 'active', 'locked', 'archived');--> statement-breakpoint
CREATE TYPE "public"."planning_mode" AS ENUM('income_based', 'spending_cap_based');--> statement-breakpoint
CREATE TYPE "public"."category_kind" AS ENUM('expense', 'income', 'transfer', 'savings');--> statement-breakpoint
CREATE TYPE "public"."fixed_expense_cadence" AS ENUM('every_period');--> statement-breakpoint
CREATE TYPE "public"."fixed_expense_inclusion" AS ENUM('included', 'skipped', 'removed');--> statement-breakpoint
CREATE TYPE "public"."fixed_expense_origin" AS ENUM('recurring_template', 'one_off');--> statement-breakpoint
CREATE TYPE "public"."allocation_strategy" AS ENUM('equal_split', 'calendar_aware');--> statement-breakpoint
CREATE TYPE "public"."week_status" AS ENUM('upcoming', 'current', 'completed');--> statement-breakpoint
CREATE TYPE "public"."match_type" AS ENUM('merchant', 'contains_text', 'exact_text');--> statement-breakpoint
CREATE TYPE "public"."transaction_direction" AS ENUM('debit', 'credit');--> statement-breakpoint
CREATE TYPE "public"."upload_status" AS ENUM('uploaded', 'processing', 'processed', 'failed', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."goal_feasibility" AS ENUM('on_track', 'at_risk', 'unrealistic');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('active', 'paused', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."expense_source" AS ENUM('manual', 'receipt_upload');--> statement-breakpoint
CREATE TYPE "public"."file_parse_status" AS ENUM('uploaded', 'processing', 'parsed', 'failed', 'confirmed', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."receipt_parse_status" AS ENUM('not_applicable', 'pending', 'parsed', 'failed', 'confirmed');--> statement-breakpoint
CREATE TYPE "public"."actor_type" AS ENUM('user', 'system');--> statement-breakpoint
CREATE TYPE "public"."recommendation_status" AS ENUM('active', 'dismissed', 'accepted', 'expired');--> statement-breakpoint
CREATE TYPE "public"."recommendation_type" AS ENUM('reduce_category', 'adjust_goal', 'risk_alert', 'recurring_spend_notice');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"full_name" text,
	"preferred_currency" text DEFAULT 'NGN' NOT NULL,
	"timezone" text DEFAULT 'Africa/Lagos' NOT NULL,
	"budget_cycle_anchor_day" integer DEFAULT 1,
	"default_budget_cycle_type" "budget_cycle_type" DEFAULT 'calendar_month' NOT NULL,
	"week_start_day" "week_start_day" DEFAULT 'monday' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "budget_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"period_start_date" date NOT NULL,
	"period_end_date" date NOT NULL,
	"cycle_type" text DEFAULT 'calendar_month' NOT NULL,
	"preset_month" text,
	"planning_mode" "planning_mode" DEFAULT 'income_based' NOT NULL,
	"monthly_income_amount" numeric(15, 2),
	"monthly_budget_cap_amount" numeric(15, 2),
	"currency" text DEFAULT 'NGN' NOT NULL,
	"notes" text,
	"status" "budget_period_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"locked_at" timestamp,
	CONSTRAINT "budget_periods_user_id_period_start_date_unique" UNIQUE("user_id","period_start_date")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"group_name" text,
	"kind" "category_kind" DEFAULT 'expense' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_user_id_code_unique" UNIQUE("user_id","code")
);
--> statement-breakpoint
CREATE TABLE "fixed_expense_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"budget_period_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"fixed_expense_template_id" uuid,
	"name" text NOT NULL,
	"category_id" uuid,
	"amount" numeric(15, 2) NOT NULL,
	"due_date" text,
	"origin_type" "fixed_expense_origin" DEFAULT 'one_off' NOT NULL,
	"inclusion_status" "fixed_expense_inclusion" DEFAULT 'included' NOT NULL,
	"is_mandatory" boolean DEFAULT false NOT NULL,
	"is_protected_from_cut_recommendations" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fixed_expense_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"category_id" uuid,
	"amount" numeric(15, 2) NOT NULL,
	"cadence" "fixed_expense_cadence" DEFAULT 'every_period' NOT NULL,
	"default_due_day" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_mandatory" boolean DEFAULT false NOT NULL,
	"is_protected_from_cut_recommendations" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_budget_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"budget_period_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"week_index" integer NOT NULL,
	"week_start_date" date NOT NULL,
	"week_end_date" date NOT NULL,
	"allocation_strategy" "allocation_strategy" DEFAULT 'equal_split' NOT NULL,
	"planned_amount" numeric(15, 2) NOT NULL,
	"adjustment_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"final_planned_amount" numeric(15, 2) NOT NULL,
	"actual_spent_amount_cache" numeric(15, 2),
	"remaining_amount_cache" numeric(15, 2),
	"status" "week_status" DEFAULT 'upcoming' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_budget_allocations_budget_period_id_week_index_unique" UNIQUE("budget_period_id","week_index")
);
--> statement-breakpoint
CREATE TABLE "statement_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"budget_period_id" uuid,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"storage_path" text NOT NULL,
	"upload_status" "upload_status" DEFAULT 'uploaded' NOT NULL,
	"statement_period_start" date,
	"statement_period_end" date,
	"parse_error_summary" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "transaction_category_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"match_type" "match_type" NOT NULL,
	"match_value" text NOT NULL,
	"category_id" uuid NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_from_transaction_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"statement_upload_id" uuid,
	"budget_period_id" uuid,
	"posted_date" date NOT NULL,
	"description_raw" text NOT NULL,
	"description_normalized" text,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"direction" "transaction_direction" NOT NULL,
	"merchant_name" text,
	"category_id" uuid,
	"category_confidence" integer,
	"is_user_corrected" boolean DEFAULT false NOT NULL,
	"is_excluded_from_analysis" boolean DEFAULT false NOT NULL,
	"external_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_budget_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"budget_period_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"reserved_amount" numeric(15, 2) NOT NULL,
	"recommended_amount" numeric(15, 2),
	"feasibility_status" "goal_feasibility" DEFAULT 'on_track' NOT NULL,
	"feasibility_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "savings_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"target_amount" numeric(15, 2) NOT NULL,
	"current_saved_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"target_date" text,
	"priority_rank" integer DEFAULT 0 NOT NULL,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"reserve_in_budget" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"budget_period_id" uuid NOT NULL,
	"weekly_budget_allocation_id" uuid,
	"category_id" uuid,
	"amount" numeric(15, 2) NOT NULL,
	"expense_date" text NOT NULL,
	"description" text,
	"source_type" "expense_source" DEFAULT 'manual' NOT NULL,
	"merchant_name" text,
	"receipt_parse_confidence" integer,
	"receipt_parse_status" "receipt_parse_status" DEFAULT 'not_applicable' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "expense_entry_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"expense_entry_id" uuid,
	"file_name" text NOT NULL,
	"storage_path" text NOT NULL,
	"parse_status" "file_parse_status" DEFAULT 'uploaded' NOT NULL,
	"parsed_amount" numeric(15, 2),
	"parsed_expense_date" text,
	"parsed_merchant_name" text,
	"raw_parser_output_json" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"event_type" text NOT NULL,
	"actor_type" "actor_type" DEFAULT 'user' NOT NULL,
	"change_summary_json" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"budget_period_id" uuid,
	"recommendation_type" "recommendation_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"estimated_monthly_impact" numeric(15, 2),
	"evidence_json" text,
	"status" "recommendation_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_periods" ADD CONSTRAINT "budget_periods_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_expense_items" ADD CONSTRAINT "fixed_expense_items_budget_period_id_budget_periods_id_fk" FOREIGN KEY ("budget_period_id") REFERENCES "public"."budget_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_expense_items" ADD CONSTRAINT "fixed_expense_items_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_expense_items" ADD CONSTRAINT "fixed_expense_items_fixed_expense_template_id_fixed_expense_templates_id_fk" FOREIGN KEY ("fixed_expense_template_id") REFERENCES "public"."fixed_expense_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_expense_items" ADD CONSTRAINT "fixed_expense_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_expense_templates" ADD CONSTRAINT "fixed_expense_templates_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_expense_templates" ADD CONSTRAINT "fixed_expense_templates_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_budget_allocations" ADD CONSTRAINT "weekly_budget_allocations_budget_period_id_budget_periods_id_fk" FOREIGN KEY ("budget_period_id") REFERENCES "public"."budget_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_budget_allocations" ADD CONSTRAINT "weekly_budget_allocations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_uploads" ADD CONSTRAINT "statement_uploads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_uploads" ADD CONSTRAINT "statement_uploads_budget_period_id_budget_periods_id_fk" FOREIGN KEY ("budget_period_id") REFERENCES "public"."budget_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_category_rules" ADD CONSTRAINT "transaction_category_rules_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_category_rules" ADD CONSTRAINT "transaction_category_rules_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_category_rules" ADD CONSTRAINT "transaction_category_rules_created_from_transaction_id_transactions_id_fk" FOREIGN KEY ("created_from_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_statement_upload_id_statement_uploads_id_fk" FOREIGN KEY ("statement_upload_id") REFERENCES "public"."statement_uploads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_budget_period_id_budget_periods_id_fk" FOREIGN KEY ("budget_period_id") REFERENCES "public"."budget_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_budget_reservations" ADD CONSTRAINT "goal_budget_reservations_budget_period_id_budget_periods_id_fk" FOREIGN KEY ("budget_period_id") REFERENCES "public"."budget_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_budget_reservations" ADD CONSTRAINT "goal_budget_reservations_goal_id_savings_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."savings_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_entries" ADD CONSTRAINT "expense_entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_entries" ADD CONSTRAINT "expense_entries_budget_period_id_budget_periods_id_fk" FOREIGN KEY ("budget_period_id") REFERENCES "public"."budget_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_entries" ADD CONSTRAINT "expense_entries_weekly_budget_allocation_id_weekly_budget_allocations_id_fk" FOREIGN KEY ("weekly_budget_allocation_id") REFERENCES "public"."weekly_budget_allocations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_entries" ADD CONSTRAINT "expense_entries_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_entry_receipts" ADD CONSTRAINT "expense_entry_receipts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_entry_receipts" ADD CONSTRAINT "expense_entry_receipts_expense_entry_id_expense_entries_id_fk" FOREIGN KEY ("expense_entry_id") REFERENCES "public"."expense_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_snapshots" ADD CONSTRAINT "recommendation_snapshots_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_snapshots" ADD CONSTRAINT "recommendation_snapshots_budget_period_id_budget_periods_id_fk" FOREIGN KEY ("budget_period_id") REFERENCES "public"."budget_periods"("id") ON DELETE no action ON UPDATE no action;