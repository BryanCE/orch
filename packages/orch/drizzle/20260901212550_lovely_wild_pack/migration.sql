CREATE TABLE `control_outcomes` (
	`id` text PRIMARY KEY,
	`agent_id` text NOT NULL,
	`command` text NOT NULL,
	`requested` text NOT NULL,
	`settled_at` integer NOT NULL,
	`error` text
);
--> statement-breakpoint
CREATE INDEX `control_outcomes_agent` ON `control_outcomes` (`agent_id`,`settled_at`);