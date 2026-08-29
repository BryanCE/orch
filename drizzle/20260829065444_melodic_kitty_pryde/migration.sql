PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_events` (
	`seq` integer PRIMARY KEY AUTOINCREMENT,
	`ts` integer NOT NULL,
	`payload` text NOT NULL
) STRICT;
--> statement-breakpoint
INSERT INTO `__new_events`(`seq`, `ts`, `payload`) SELECT `seq`, `ts`, `payload` FROM `events`;--> statement-breakpoint
DROP TABLE `events`;--> statement-breakpoint
ALTER TABLE `__new_events` RENAME TO `events`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_outbox` (
	`id` text PRIMARY KEY,
	`target` text NOT NULL,
	`payload` text NOT NULL,
	`state` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`next_attempt_at` integer DEFAULT 0 NOT NULL
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
INSERT INTO `__new_outbox`(`id`, `target`, `payload`, `state`, `attempts`, `created_at`, `next_attempt_at`) SELECT `id`, `target`, `payload`, `state`, `attempts`, `created_at`, `next_attempt_at` FROM `outbox`;--> statement-breakpoint
DROP TABLE `outbox`;--> statement-breakpoint
ALTER TABLE `__new_outbox` RENAME TO `outbox`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ownership` (
	`agent_key` text PRIMARY KEY,
	`owner` text NOT NULL,
	`updated_at` integer NOT NULL
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
INSERT INTO `__new_ownership`(`agent_key`, `owner`, `updated_at`) SELECT `agent_key`, `owner`, `updated_at` FROM `ownership`;--> statement-breakpoint
DROP TABLE `ownership`;--> statement-breakpoint
ALTER TABLE `__new_ownership` RENAME TO `ownership`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_runs` (
	`dispatch_id` text PRIMARY KEY,
	`agent_key` text NOT NULL,
	`adapter` text,
	`model` text,
	`workspace` text,
	`task` text,
	`state` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`tokens_in` integer,
	`tokens_out` integer,
	`cache_read` integer,
	`cache_write` integer,
	`cost` real,
	`turns` integer,
	`result` text,
	`last_error` text
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
INSERT INTO `__new_runs`(`dispatch_id`, `agent_key`, `adapter`, `model`, `workspace`, `task`, `state`, `started_at`, `finished_at`, `tokens_in`, `tokens_out`, `cache_read`, `cache_write`, `cost`, `turns`, `result`, `last_error`) SELECT `dispatch_id`, `agent_key`, `adapter`, `model`, `workspace`, `task`, `state`, `started_at`, `finished_at`, `tokens_in`, `tokens_out`, `cache_read`, `cache_write`, `cost`, `turns`, `result`, `last_error` FROM `runs`;--> statement-breakpoint
DROP TABLE `runs`;--> statement-breakpoint
ALTER TABLE `__new_runs` RENAME TO `runs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_spawned` (
	`pane` text PRIMARY KEY,
	`ts` integer,
	`adapter` text,
	`model` text,
	`backend` text,
	`workspace` text,
	`handle` text,
	`name` text,
	`cwd` text,
	`worktree` text,
	`branch` text,
	`spawned_by` text,
	`spawned_by_label` text
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
INSERT INTO `__new_spawned`(`pane`, `ts`, `adapter`, `model`, `backend`, `workspace`, `handle`, `name`, `cwd`, `worktree`, `branch`, `spawned_by`, `spawned_by_label`) SELECT `pane`, `ts`, `adapter`, `model`, `backend`, `workspace`, `handle`, `name`, `cwd`, `worktree`, `branch`, `spawned_by`, `spawned_by_label` FROM `spawned`;--> statement-breakpoint
DROP TABLE `spawned`;--> statement-breakpoint
ALTER TABLE `__new_spawned` RENAME TO `spawned`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `outbox_pending` ON `outbox` (`state`,`next_attempt_at`);--> statement-breakpoint
CREATE INDEX `runs_agent_started` ON `runs` (`agent_key`,`started_at`);