ALTER TABLE `agent_origins` RENAME COLUMN `host_id` TO `asked_by_host_id`;--> statement-breakpoint
ALTER TABLE `agent_hosts` ADD `since` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `agent_hosts` ADD `until` integer;--> statement-breakpoint
ALTER TABLE `agent_hosts` ADD `cwd` text NOT NULL;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_agent_hosts` (
	`agent_id` text NOT NULL,
	`since` integer NOT NULL,
	`until` integer,
	`host_id` text NOT NULL,
	`cwd` text NOT NULL,
	CONSTRAINT `agent_hosts_pk` PRIMARY KEY(`agent_id`, `since`),
	CONSTRAINT `fk_agent_hosts_agent_id_agents_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_agent_hosts_host_id_hosts_id_fk` FOREIGN KEY (`host_id`) REFERENCES `hosts`(`id`),
	CONSTRAINT "agent_hosts_interval" CHECK("until" IS NULL OR "until" > "since")
);
--> statement-breakpoint
INSERT INTO `__new_agent_hosts`(`agent_id`, `host_id`) SELECT `agent_id`, `host_id` FROM `agent_hosts`;--> statement-breakpoint
DROP TABLE `agent_hosts`;--> statement-breakpoint
ALTER TABLE `__new_agent_hosts` RENAME TO `agent_hosts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_agent_processes` (
	`agent_id` text NOT NULL,
	`since` integer NOT NULL,
	`until` integer,
	`pid` integer NOT NULL,
	`start_token` text,
	CONSTRAINT `agent_processes_pk` PRIMARY KEY(`agent_id`, `since`),
	CONSTRAINT `fk_agent_processes_agent_id_agents_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE,
	CONSTRAINT "agent_processes_interval" CHECK("until" IS NULL OR "until" > "since")
);
--> statement-breakpoint
INSERT INTO `__new_agent_processes`(`agent_id`, `since`, `until`, `pid`, `start_token`) SELECT `agent_id`, `since`, `until`, `pid`, `start_token` FROM `agent_processes`;--> statement-breakpoint
DROP TABLE `agent_processes`;--> statement-breakpoint
ALTER TABLE `__new_agent_processes` RENAME TO `agent_processes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP INDEX IF EXISTS `agent_origins_by_host`;--> statement-breakpoint
CREATE UNIQUE INDEX `one_agent_host` ON `agent_hosts` (`agent_id`) WHERE until IS NULL;--> statement-breakpoint
CREATE INDEX `agent_hosts_by_host` ON `agent_hosts` (`host_id`) WHERE until IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `one_live_process` ON `agent_processes` (`agent_id`) WHERE until IS NULL;--> statement-breakpoint
CREATE INDEX `agent_origins_by_asking_host` ON `agent_origins` (`asked_by_host_id`);--> statement-breakpoint
ALTER TABLE `agents` DROP COLUMN `cwd`;