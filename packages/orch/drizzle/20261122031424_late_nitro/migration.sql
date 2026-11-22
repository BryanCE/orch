CREATE TABLE `agent_read_only` (
	`agent_id` text PRIMARY KEY,
	`out_dir` text,
	`set_at` integer NOT NULL,
	CONSTRAINT `fk_agent_read_only_agent_id_agents_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `council_members` (
	`agent_id` text PRIMARY KEY,
	`council_id` text NOT NULL,
	`name` text NOT NULL,
	CONSTRAINT `fk_council_members_agent_id_agents_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_council_members_council_id_councils_id_fk` FOREIGN KEY (`council_id`) REFERENCES `councils`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `council_reviews` (
	`dispatch_id` text PRIMARY KEY,
	`council_id` text NOT NULL,
	`round` integer NOT NULL,
	`member` text NOT NULL,
	`asked_at` integer NOT NULL,
	`score` integer,
	`problem` text,
	`scored_at` integer,
	CONSTRAINT `fk_council_reviews_council_id_councils_id_fk` FOREIGN KEY (`council_id`) REFERENCES `councils`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `councils` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`directory` text NOT NULL,
	`convened_by` text NOT NULL,
	`scale` integer NOT NULL,
	`convened_at` integer NOT NULL,
	`closed_at` integer,
	CONSTRAINT `fk_councils_convened_by_agents_id_fk` FOREIGN KEY (`convened_by`) REFERENCES `agents`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_member_per_name` ON `council_members` (`council_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `one_review_per_round` ON `council_reviews` (`council_id`,`round`,`member`);--> statement-breakpoint
CREATE UNIQUE INDEX `one_council_per_directory` ON `councils` (`directory`);