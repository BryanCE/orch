CREATE TABLE `agent_hosts` (
	`agent_id` text PRIMARY KEY,
	`host_id` text NOT NULL,
	CONSTRAINT `fk_agent_hosts_agent_id_agents_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_agent_hosts_host_id_hosts_id_fk` FOREIGN KEY (`host_id`) REFERENCES `hosts`(`id`)
);
--> statement-breakpoint
CREATE INDEX `agent_hosts_by_host` ON `agent_hosts` (`host_id`);