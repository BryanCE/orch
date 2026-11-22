CREATE TABLE `agent_projects` (
	`agent_id` text PRIMARY KEY,
	`path` text NOT NULL,
	CONSTRAINT `fk_agent_projects_agent_id_agents_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE
);
