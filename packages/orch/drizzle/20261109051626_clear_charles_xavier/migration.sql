CREATE TABLE `agent_origins` (
	`agent_id` text PRIMARY KEY,
	`host_id` text NOT NULL,
	`spawner_id` text,
	CONSTRAINT `fk_agent_origins_agent_id_agents_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `agent_origins_by_host` ON `agent_origins` (`host_id`);