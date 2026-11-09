CREATE TABLE `host_event_cursors` (
	`host_id` text PRIMARY KEY,
	`seq` integer NOT NULL,
	CONSTRAINT `fk_host_event_cursors_host_id_hosts_id_fk` FOREIGN KEY (`host_id`) REFERENCES `hosts`(`id`) ON DELETE CASCADE
);
