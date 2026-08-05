CREATE TABLE `receipt_line_items` (
	`id` text PRIMARY KEY NOT NULL,
	`receipt_id` text NOT NULL,
	`name` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price_cents` integer,
	`total_price_cents` integer NOT NULL,
	`category_id` text,
	`status` text DEFAULT 'suggested' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`receipt_id`) REFERENCES `expense_entry_receipts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `income_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`budget_period_id` text NOT NULL,
	`category_id` text,
	`transaction_id` text,
	`amount_cents` integer NOT NULL,
	`income_date` text NOT NULL,
	`description` text,
	`source_type` text DEFAULT 'manual' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`budget_period_id`) REFERENCES `budget_periods`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `statement_uploads` ADD `raw_markdown` text;--> statement-breakpoint
ALTER TABLE `statement_uploads` ADD `raw_parser_output_json` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `parent_transaction_id` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `is_internal_bookkeeping` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `transaction_type` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `raw_ai_output_json` text;--> statement-breakpoint
ALTER TABLE `expense_entries` ADD `transaction_id` text REFERENCES transactions(id);--> statement-breakpoint
ALTER TABLE `expense_entry_receipts` ADD `receipt_type` text DEFAULT 'other' NOT NULL;