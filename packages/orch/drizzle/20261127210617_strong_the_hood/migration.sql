CREATE TABLE `agent_lanes` (
	`agent_id` text PRIMARY KEY,
	`lane` text NOT NULL,
	`set_at` integer NOT NULL,
	CONSTRAINT `fk_agent_lanes_agent_id_agents_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE
);
