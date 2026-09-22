CREATE TABLE `command_locks` (
	`pattern` text PRIMARY KEY,
	`pid` integer NOT NULL,
	`start_token` text,
	`agent_id` text,
	`command` text NOT NULL,
	`acquired_at` integer NOT NULL,
	CONSTRAINT `fk_command_locks_agent_id_agents_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE
);
