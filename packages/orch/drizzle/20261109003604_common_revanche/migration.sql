CREATE TABLE `host_links` (
	`host_id` text NOT NULL,
	`since` integer NOT NULL,
	`until` integer,
	`last_seen` integer NOT NULL,
	CONSTRAINT `host_links_pk` PRIMARY KEY(`host_id`, `since`),
	CONSTRAINT `fk_host_links_host_id_hosts_id_fk` FOREIGN KEY (`host_id`) REFERENCES `hosts`(`id`) ON DELETE CASCADE,
	CONSTRAINT "host_links_interval" CHECK("until" IS NULL OR "until" > "since"),
	CONSTRAINT "host_links_seen" CHECK("last_seen" >= "since")
);
--> statement-breakpoint
CREATE TABLE `host_names` (
	`name` text PRIMARY KEY,
	`host_id` text NOT NULL,
	`bound_at` integer NOT NULL,
	CONSTRAINT `fk_host_names_host_id_hosts_id_fk` FOREIGN KEY (`host_id`) REFERENCES `hosts`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_open_link` ON `host_links` (`host_id`) WHERE until IS NULL;