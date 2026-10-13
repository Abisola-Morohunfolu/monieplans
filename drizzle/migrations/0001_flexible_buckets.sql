-- Additive migration. Apply this file ONLY to an existing database.
ALTER TABLE budgets ADD COLUMN spending_limit_cents integer;
ALTER TABLE category_budgets ADD COLUMN original_target_cents integer NOT NULL DEFAULT 0;
ALTER TABLE category_budgets ADD COLUMN pacing text NOT NULL DEFAULT 'monthly';
UPDATE category_budgets SET original_target_cents = assigned_cents;
ALTER TABLE transactions ADD COLUMN payment_status text NOT NULL DEFAULT 'completed';
CREATE TABLE ledger_versions (user_id text PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE, revision integer NOT NULL DEFAULT 0);
CREATE TABLE mutation_guards (id text PRIMARY KEY, valid integer NOT NULL CHECK(valid = 1));
CREATE TABLE weekly_allocations (
 id text PRIMARY KEY, budget_id text NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
 bucket_id text NOT NULL, week_start text NOT NULL, amount_cents integer NOT NULL CHECK(amount_cents >= 0),
 UNIQUE(budget_id,bucket_id,week_start)
);
CREATE TABLE weekly_adjustments (
 id text PRIMARY KEY, budget_id text NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
 bucket_id text NOT NULL, week_start text NOT NULL, amount_cents integer NOT NULL, movement_id text NOT NULL
);
CREATE TABLE budget_movements (
 id text PRIMARY KEY, budget_id text NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
 source_id text NOT NULL, destination_id text NOT NULL, amount_cents integer NOT NULL CHECK(amount_cents > 0),
 occurred_on text NOT NULL, created_at text NOT NULL, UNIQUE(budget_id,id)
);
CREATE TABLE transaction_splits (
 id text PRIMARY KEY, transaction_id text NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
 category_id text REFERENCES categories(id), amount_cents integer NOT NULL CHECK(amount_cents > 0)
);
CREATE INDEX splits_transaction_idx ON transaction_splits(transaction_id);
CREATE TABLE captures (
 id text PRIMARY KEY, user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
 object_key text NOT NULL, sha256 text NOT NULL, mime_type text NOT NULL, size_bytes integer NOT NULL,
 status text NOT NULL DEFAULT 'queued', attempt integer NOT NULL DEFAULT 0, generation integer NOT NULL DEFAULT 0,
 default_category_id text REFERENCES categories(id), opened_month text,
 extracted_json text, error text, transaction_id text REFERENCES transactions(id),
 created_at text NOT NULL, updated_at text NOT NULL, UNIQUE(user_id,sha256)
);
CREATE INDEX captures_user_idx ON captures(user_id,created_at);
CREATE TABLE recommendations (
 id text PRIMARY KEY, user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE, month text NOT NULL,
 fingerprint text NOT NULL, summary_json text NOT NULL, proposal_json text NOT NULL,
 created_at text NOT NULL, applied_at text
);
CREATE TRIGGER budgets_revision_insert AFTER INSERT ON budgets BEGIN
 INSERT INTO ledger_versions(user_id,revision) SELECT NEW.user_id,1 WHERE EXISTS(SELECT 1 FROM user WHERE id=NEW.user_id)
 ON CONFLICT(user_id) DO UPDATE SET revision=revision+1;
END;
CREATE TRIGGER budgets_revision_update AFTER UPDATE ON budgets BEGIN
 INSERT INTO ledger_versions(user_id,revision) SELECT NEW.user_id,1 WHERE EXISTS(SELECT 1 FROM user WHERE id=NEW.user_id)
 ON CONFLICT(user_id) DO UPDATE SET revision=revision+1;
END;
CREATE TRIGGER budgets_revision_delete AFTER DELETE ON budgets BEGIN
 INSERT INTO ledger_versions(user_id,revision) SELECT OLD.user_id,1 WHERE EXISTS(SELECT 1 FROM user WHERE id=OLD.user_id)
 ON CONFLICT(user_id) DO UPDATE SET revision=revision+1;
END;
CREATE TRIGGER category_budgets_revision_insert AFTER INSERT ON category_budgets BEGIN
 INSERT INTO ledger_versions(user_id,revision) SELECT (SELECT user_id FROM budgets WHERE id=NEW.budget_id),1 WHERE EXISTS(SELECT 1 FROM user WHERE id=(SELECT user_id FROM budgets WHERE id=NEW.budget_id))
 ON CONFLICT(user_id) DO UPDATE SET revision=revision+1;
END;
CREATE TRIGGER category_budgets_revision_update AFTER UPDATE ON category_budgets BEGIN
 INSERT INTO ledger_versions(user_id,revision) SELECT (SELECT user_id FROM budgets WHERE id=NEW.budget_id),1 WHERE EXISTS(SELECT 1 FROM user WHERE id=(SELECT user_id FROM budgets WHERE id=NEW.budget_id))
 ON CONFLICT(user_id) DO UPDATE SET revision=revision+1;
END;
CREATE TRIGGER category_budgets_revision_delete AFTER DELETE ON category_budgets BEGIN
 INSERT INTO ledger_versions(user_id,revision) SELECT (SELECT user_id FROM budgets WHERE id=OLD.budget_id),1 WHERE EXISTS(SELECT 1 FROM user WHERE id=(SELECT user_id FROM budgets WHERE id=OLD.budget_id))
 ON CONFLICT(user_id) DO UPDATE SET revision=revision+1;
END;
CREATE TRIGGER weekly_allocations_revision_insert AFTER INSERT ON weekly_allocations BEGIN
 INSERT INTO ledger_versions(user_id,revision) SELECT (SELECT user_id FROM budgets WHERE id=NEW.budget_id),1 WHERE EXISTS(SELECT 1 FROM user WHERE id=(SELECT user_id FROM budgets WHERE id=NEW.budget_id))
 ON CONFLICT(user_id) DO UPDATE SET revision=revision+1;
END;
CREATE TRIGGER weekly_allocations_revision_update AFTER UPDATE ON weekly_allocations BEGIN
 INSERT INTO ledger_versions(user_id,revision) SELECT (SELECT user_id FROM budgets WHERE id=NEW.budget_id),1 WHERE EXISTS(SELECT 1 FROM user WHERE id=(SELECT user_id FROM budgets WHERE id=NEW.budget_id))
 ON CONFLICT(user_id) DO UPDATE SET revision=revision+1;
END;
CREATE TRIGGER weekly_allocations_revision_delete AFTER DELETE ON weekly_allocations BEGIN
 INSERT INTO ledger_versions(user_id,revision) SELECT (SELECT user_id FROM budgets WHERE id=OLD.budget_id),1 WHERE EXISTS(SELECT 1 FROM user WHERE id=(SELECT user_id FROM budgets WHERE id=OLD.budget_id))
 ON CONFLICT(user_id) DO UPDATE SET revision=revision+1;
END;
CREATE TRIGGER weekly_adjustments_revision_insert AFTER INSERT ON weekly_adjustments BEGIN
 INSERT INTO ledger_versions(user_id,revision) SELECT (SELECT user_id FROM budgets WHERE id=NEW.budget_id),1 WHERE EXISTS(SELECT 1 FROM user WHERE id=(SELECT user_id FROM budgets WHERE id=NEW.budget_id))
 ON CONFLICT(user_id) DO UPDATE SET revision=revision+1;
END;
CREATE TRIGGER weekly_adjustments_revision_update AFTER UPDATE ON weekly_adjustments BEGIN
 INSERT INTO ledger_versions(user_id,revision) SELECT (SELECT user_id FROM budgets WHERE id=NEW.budget_id),1 WHERE EXISTS(SELECT 1 FROM user WHERE id=(SELECT user_id FROM budgets WHERE id=NEW.budget_id))
 ON CONFLICT(user_id) DO UPDATE SET revision=revision+1;
END;
CREATE TRIGGER weekly_adjustments_revision_delete AFTER DELETE ON weekly_adjustments BEGIN
 INSERT INTO ledger_versions(user_id,revision) SELECT (SELECT user_id FROM budgets WHERE id=OLD.budget_id),1 WHERE EXISTS(SELECT 1 FROM user WHERE id=(SELECT user_id FROM budgets WHERE id=OLD.budget_id))
 ON CONFLICT(user_id) DO UPDATE SET revision=revision+1;
END;
CREATE TRIGGER budget_movements_revision_insert AFTER INSERT ON budget_movements BEGIN
 INSERT INTO ledger_versions(user_id,revision) SELECT (SELECT user_id FROM budgets WHERE id=NEW.budget_id),1 WHERE EXISTS(SELECT 1 FROM user WHERE id=(SELECT user_id FROM budgets WHERE id=NEW.budget_id))
 ON CONFLICT(user_id) DO UPDATE SET revision=revision+1;
END;
CREATE TRIGGER budget_movements_revision_update AFTER UPDATE ON budget_movements BEGIN
 INSERT INTO ledger_versions(user_id,revision) SELECT (SELECT user_id FROM budgets WHERE id=NEW.budget_id),1 WHERE EXISTS(SELECT 1 FROM user WHERE id=(SELECT user_id FROM budgets WHERE id=NEW.budget_id))
 ON CONFLICT(user_id) DO UPDATE SET revision=revision+1;
END;
CREATE TRIGGER budget_movements_revision_delete AFTER DELETE ON budget_movements BEGIN
 INSERT INTO ledger_versions(user_id,revision) SELECT (SELECT user_id FROM budgets WHERE id=OLD.budget_id),1 WHERE EXISTS(SELECT 1 FROM user WHERE id=(SELECT user_id FROM budgets WHERE id=OLD.budget_id))
 ON CONFLICT(user_id) DO UPDATE SET revision=revision+1;
END;
CREATE TRIGGER transactions_revision_insert AFTER INSERT ON transactions BEGIN
 INSERT INTO ledger_versions(user_id,revision) SELECT NEW.user_id,1 WHERE EXISTS(SELECT 1 FROM user WHERE id=NEW.user_id)
 ON CONFLICT(user_id) DO UPDATE SET revision=revision+1;
END;
CREATE TRIGGER transactions_revision_update AFTER UPDATE ON transactions BEGIN
 INSERT INTO ledger_versions(user_id,revision) SELECT NEW.user_id,1 WHERE EXISTS(SELECT 1 FROM user WHERE id=NEW.user_id)
 ON CONFLICT(user_id) DO UPDATE SET revision=revision+1;
END;
CREATE TRIGGER transactions_revision_delete AFTER DELETE ON transactions BEGIN
 INSERT INTO ledger_versions(user_id,revision) SELECT OLD.user_id,1 WHERE EXISTS(SELECT 1 FROM user WHERE id=OLD.user_id)
 ON CONFLICT(user_id) DO UPDATE SET revision=revision+1;
END;
CREATE TRIGGER transaction_splits_revision_insert AFTER INSERT ON transaction_splits BEGIN
 INSERT INTO ledger_versions(user_id,revision) SELECT (SELECT user_id FROM transactions WHERE id=NEW.transaction_id),1 WHERE EXISTS(SELECT 1 FROM user WHERE id=(SELECT user_id FROM transactions WHERE id=NEW.transaction_id))
 ON CONFLICT(user_id) DO UPDATE SET revision=revision+1;
END;
CREATE TRIGGER transaction_splits_revision_update AFTER UPDATE ON transaction_splits BEGIN
 INSERT INTO ledger_versions(user_id,revision) SELECT (SELECT user_id FROM transactions WHERE id=NEW.transaction_id),1 WHERE EXISTS(SELECT 1 FROM user WHERE id=(SELECT user_id FROM transactions WHERE id=NEW.transaction_id))
 ON CONFLICT(user_id) DO UPDATE SET revision=revision+1;
END;
CREATE TRIGGER transaction_splits_revision_delete AFTER DELETE ON transaction_splits BEGIN
 INSERT INTO ledger_versions(user_id,revision) SELECT (SELECT user_id FROM transactions WHERE id=OLD.transaction_id),1 WHERE EXISTS(SELECT 1 FROM user WHERE id=(SELECT user_id FROM transactions WHERE id=OLD.transaction_id))
 ON CONFLICT(user_id) DO UPDATE SET revision=revision+1;
END;
