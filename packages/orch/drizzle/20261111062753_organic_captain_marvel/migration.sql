CREATE TABLE `store_identity` (
	`id` text PRIMARY KEY,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `host_event_cursors` ADD `log` text NOT NULL;