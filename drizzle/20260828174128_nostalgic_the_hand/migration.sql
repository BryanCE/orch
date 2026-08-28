CREATE TABLE `agent_endings` (
	`agent_id` text PRIMARY KEY NOT NULL,
	`ended_at` integer NOT NULL,
	`closed_by` text,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`closed_by`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE TABLE `agent_handles` (
	`agent_id` text NOT NULL,
	`since` integer NOT NULL,
	`until` integer,
	`handle` text NOT NULL,
	PRIMARY KEY(`agent_id`, `since`),
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "agent_handles_interval" CHECK("agent_handles"."until" IS NULL OR "agent_handles"."until" > "agent_handles"."since")
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE UNIQUE INDEX `one_handle` ON `agent_handles` (`agent_id`) WHERE until IS NULL;--> statement-breakpoint
CREATE TABLE `agent_leases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agent_id` text NOT NULL,
	`orch_id` text NOT NULL,
	`since` integer NOT NULL,
	`until` integer,
	`release_reason` text,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`orch_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "agent_leases_reason" CHECK("agent_leases"."release_reason" IS NULL OR "agent_leases"."release_reason" IN ('released','handoff','adopted','expired')),
	CONSTRAINT "agent_leases_interval" CHECK("agent_leases"."until" IS NULL OR "agent_leases"."until" > "agent_leases"."since"),
	CONSTRAINT "agent_leases_closed_has_reason" CHECK(("agent_leases"."until" IS NULL) = ("agent_leases"."release_reason" IS NULL)),
	CONSTRAINT "agent_leases_not_self" CHECK("agent_leases"."orch_id" <> "agent_leases"."agent_id")
) STRICT;
--> statement-breakpoint
CREATE UNIQUE INDEX `one_lease` ON `agent_leases` (`agent_id`) WHERE until IS NULL;--> statement-breakpoint
CREATE INDEX `leases_by_orch` ON `agent_leases` (`orch_id`) WHERE until IS NULL;--> statement-breakpoint
CREATE TABLE `agent_plexers` (
	`agent_id` text PRIMARY KEY NOT NULL,
	`plexer_id` text NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plexer_id`) REFERENCES `plexers`(`id`) ON UPDATE no action ON DELETE no action
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE TABLE `agent_processes` (
	`agent_id` text NOT NULL,
	`since` integer NOT NULL,
	`until` integer,
	`host_id` text NOT NULL,
	`pid` integer NOT NULL,
	`start_token` text,
	PRIMARY KEY(`agent_id`, `since`),
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`host_id`) REFERENCES `hosts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "agent_processes_interval" CHECK("agent_processes"."until" IS NULL OR "agent_processes"."until" > "agent_processes"."since")
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE UNIQUE INDEX `one_live_process` ON `agent_processes` (`agent_id`) WHERE until IS NULL;--> statement-breakpoint
CREATE TABLE `agent_spaces` (
	`agent_id` text NOT NULL,
	`since` integer NOT NULL,
	`until` integer,
	`space_id` text NOT NULL,
	PRIMARY KEY(`agent_id`, `since`),
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`space_id`) REFERENCES `spaces`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "agent_spaces_interval" CHECK("agent_spaces"."until" IS NULL OR "agent_spaces"."until" > "agent_spaces"."since")
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE UNIQUE INDEX `one_space` ON `agent_spaces` (`agent_id`) WHERE until IS NULL;--> statement-breakpoint
CREATE TABLE `agent_tunings` (
	`agent_id` text NOT NULL,
	`since` integer NOT NULL,
	`until` integer,
	`model` text NOT NULL,
	`thinking` text,
	PRIMARY KEY(`agent_id`, `since`),
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "agent_tunings_interval" CHECK("agent_tunings"."until" IS NULL OR "agent_tunings"."until" > "agent_tunings"."since")
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE UNIQUE INDEX `one_tuning` ON `agent_tunings` (`agent_id`) WHERE until IS NULL;--> statement-breakpoint
CREATE TABLE `agent_worktrees` (
	`agent_id` text PRIMARY KEY NOT NULL,
	`path` text NOT NULL,
	`branch` text NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`spawned_by` text,
	`root_agent_id` text NOT NULL,
	`harness_id` text NOT NULL,
	`cwd` text NOT NULL,
	`name` text NOT NULL,
	`label` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`spawned_by`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`root_agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`harness_id`) REFERENCES `harnesses`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "agents_not_self_spawned" CHECK("agents"."spawned_by" IS NULL OR "agents"."spawned_by" <> "agents"."id"),
	CONSTRAINT "agents_root_is_self" CHECK("agents"."spawned_by" IS NOT NULL OR "agents"."root_agent_id" = "agents"."id")
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE INDEX `agents_by_pack` ON `agents` (`root_agent_id`);--> statement-breakpoint
CREATE INDEX `agents_by_spawner` ON `agents` (`spawned_by`);--> statement-breakpoint
CREATE TABLE `catalogues` (
	`command` text PRIMARY KEY NOT NULL,
	`at` integer NOT NULL,
	`stdout` text NOT NULL
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE TABLE `events` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ts` text NOT NULL,
	`payload` text NOT NULL
) STRICT;
--> statement-breakpoint
CREATE TABLE `grant_approvals` (
	`request_id` text PRIMARY KEY NOT NULL,
	`approved_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`host_id` text NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `grant_requests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`host_id`) REFERENCES `hosts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "grant_approvals_expiry" CHECK("grant_approvals"."expires_at" > "grant_approvals"."approved_at")
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE TABLE `grant_denials` (
	`request_id` text PRIMARY KEY NOT NULL,
	`denied_at` integer NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `grant_requests`(`id`) ON UPDATE no action ON DELETE cascade
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE TABLE `grant_request_params` (
	`request_id` text NOT NULL,
	`name` text NOT NULL,
	`value` text NOT NULL,
	PRIMARY KEY(`request_id`, `name`),
	FOREIGN KEY (`request_id`) REFERENCES `grant_requests`(`id`) ON UPDATE no action ON DELETE cascade
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE TABLE `grant_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`action_hash` text NOT NULL,
	`kind` text NOT NULL,
	`requested_by` text,
	`requested_at` integer NOT NULL,
	FOREIGN KEY (`requested_by`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE INDEX `grants_by_action` ON `grant_requests` (`action_hash`);--> statement-breakpoint
CREATE TABLE `grant_spends` (
	`request_id` text PRIMARY KEY NOT NULL,
	`spent_at` integer NOT NULL,
	`spent_by` text,
	FOREIGN KEY (`request_id`) REFERENCES `grant_requests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`spent_by`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE TABLE `harnesses` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`enabled_at` integer
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE TABLE `host_plexers` (
	`host_id` text NOT NULL,
	`plexer_id` text NOT NULL,
	`since` integer NOT NULL,
	`until` integer,
	`version` text NOT NULL,
	PRIMARY KEY(`host_id`, `plexer_id`, `since`),
	FOREIGN KEY (`host_id`) REFERENCES `hosts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plexer_id`) REFERENCES `plexers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "host_plexers_interval" CHECK("host_plexers"."until" IS NULL OR "host_plexers"."until" > "host_plexers"."since")
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE UNIQUE INDEX `one_install` ON `host_plexers` (`host_id`,`plexer_id`) WHERE until IS NULL;--> statement-breakpoint
CREATE TABLE `hosts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`os` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "hosts_os" CHECK("hosts"."os" IN ('linux','windows','darwin'))
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE TABLE `outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`target` text NOT NULL,
	`payload` text NOT NULL,
	`state` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`next_attempt_at` integer DEFAULT 0 NOT NULL
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE INDEX `outbox_pending` ON `outbox` (`state`,`next_attempt_at`);--> statement-breakpoint
CREATE TABLE `ownership` (
	`agent_key` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`updated_at` text NOT NULL
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE TABLE `pack_intakes` (
	`pack_id` text NOT NULL,
	`space_id` text NOT NULL,
	`since` integer NOT NULL,
	`until` integer,
	PRIMARY KEY(`pack_id`, `space_id`, `since`),
	FOREIGN KEY (`pack_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`space_id`) REFERENCES `spaces`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "pack_intakes_interval" CHECK("pack_intakes"."until" IS NULL OR "pack_intakes"."until" > "pack_intakes"."since")
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE UNIQUE INDEX `one_intake` ON `pack_intakes` (`pack_id`,`space_id`) WHERE until IS NULL;--> statement-breakpoint
CREATE TABLE `pack_plexers` (
	`pack_id` text NOT NULL,
	`since` integer NOT NULL,
	`until` integer,
	`plexer_id` text NOT NULL,
	`handle` text NOT NULL,
	PRIMARY KEY(`pack_id`, `since`),
	FOREIGN KEY (`pack_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plexer_id`) REFERENCES `plexers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "pack_plexers_interval" CHECK("pack_plexers"."until" IS NULL OR "pack_plexers"."until" > "pack_plexers"."since")
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE UNIQUE INDEX `one_pack_home` ON `pack_plexers` (`pack_id`) WHERE until IS NULL;--> statement-breakpoint
CREATE TABLE `plexers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`enabled_at` integer
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE TABLE `runs` (
	`dispatch_id` text PRIMARY KEY NOT NULL,
	`agent_key` text NOT NULL,
	`adapter` text,
	`model` text,
	`workspace` text,
	`task` text,
	`state` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`tokens_in` integer,
	`tokens_out` integer,
	`cache_read` integer,
	`cache_write` integer,
	`cost` real,
	`turns` integer,
	`result` text,
	`last_error` text
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE INDEX `runs_agent_started` ON `runs` (`agent_key`,`started_at`);--> statement-breakpoint
CREATE TABLE `space_plexers` (
	`space_id` text NOT NULL,
	`since` integer NOT NULL,
	`until` integer,
	`plexer_id` text NOT NULL,
	`handle` text NOT NULL,
	PRIMARY KEY(`space_id`, `since`),
	FOREIGN KEY (`space_id`) REFERENCES `spaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plexer_id`) REFERENCES `plexers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "space_plexers_interval" CHECK("space_plexers"."until" IS NULL OR "space_plexers"."until" > "space_plexers"."since")
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE UNIQUE INDEX `one_space_home` ON `space_plexers` (`space_id`) WHERE until IS NULL;--> statement-breakpoint
CREATE TABLE `spaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE TABLE `spawned` (
	`pane` text PRIMARY KEY NOT NULL,
	`ts` text,
	`adapter` text,
	`model` text,
	`backend` text,
	`workspace` text,
	`handle` text,
	`name` text,
	`cwd` text,
	`worktree` text,
	`branch` text,
	`spawned_by` text,
	`spawned_by_label` text
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE TABLE `task_attempts` (
	`task_id` text NOT NULL,
	`since` integer NOT NULL,
	`until` integer,
	`agent_id` text NOT NULL,
	`dispatch_id` text NOT NULL,
	`outcome` text,
	`result` text,
	`error` text,
	PRIMARY KEY(`task_id`, `since`),
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "task_attempts_outcome" CHECK("task_attempts"."outcome" IS NULL OR "task_attempts"."outcome" IN ('done','failed')),
	CONSTRAINT "task_attempts_interval" CHECK("task_attempts"."until" IS NULL OR "task_attempts"."until" > "task_attempts"."since"),
	CONSTRAINT "task_attempts_closed_has_outcome" CHECK(("task_attempts"."until" IS NULL) = ("task_attempts"."outcome" IS NULL)),
	CONSTRAINT "task_attempts_failed_has_error" CHECK("task_attempts"."outcome" <> 'failed' OR "task_attempts"."error" IS NOT NULL),
	CONSTRAINT "task_attempts_result_only_done" CHECK("task_attempts"."outcome" = 'done' OR "task_attempts"."result" IS NULL)
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE UNIQUE INDEX `one_open_attempt` ON `task_attempts` (`task_id`) WHERE until IS NULL;--> statement-breakpoint
CREATE INDEX `attempts_running` ON `task_attempts` (`agent_id`) WHERE until IS NULL;--> statement-breakpoint
CREATE TABLE `task_cancellations` (
	`task_id` text PRIMARY KEY NOT NULL,
	`cancelled_at` integer NOT NULL,
	`cancelled_by` text NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`cancelled_by`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`opts` text NOT NULL,
	`enqueued_by` text NOT NULL,
	`scope_agent_id` text,
	`scope_pack_id` text,
	`scope_space_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`enqueued_by`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scope_agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scope_pack_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scope_space_id`) REFERENCES `spaces`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "tasks_exactly_one_scope" CHECK(("tasks"."scope_agent_id" IS NOT NULL) + ("tasks"."scope_pack_id" IS NOT NULL) + ("tasks"."scope_space_id" IS NOT NULL) = 1)
) STRICT, WITHOUT ROWID;
--> statement-breakpoint
CREATE INDEX `tasks_by_agent` ON `tasks` (`scope_agent_id`);--> statement-breakpoint
CREATE INDEX `tasks_by_pack` ON `tasks` (`scope_pack_id`);--> statement-breakpoint
CREATE INDEX `tasks_by_space` ON `tasks` (`scope_space_id`);--> statement-breakpoint
CREATE INDEX `tasks_by_enqueuer` ON `tasks` (`enqueued_by`);
--> statement-breakpoint
CREATE VIEW task_states AS SELECT t.id AS task_id, CASE WHEN c.task_id IS NOT NULL THEN 'cancelled' WHEN (a.task_id IS NULL OR a.until IS NULL OR a.outcome = 'failed') AND ((t.scope_agent_id IS NOT NULL AND EXISTS (SELECT 1 FROM agent_endings e WHERE e.agent_id = t.scope_agent_id)) OR (t.scope_pack_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM agents a_live WHERE a_live.root_agent_id = t.scope_pack_id AND NOT EXISTS (SELECT 1 FROM agent_endings e_live WHERE e_live.agent_id = a_live.id)))) THEN 'unrunnable' WHEN a.task_id IS NULL THEN 'queued' WHEN a.until IS NULL THEN 'claimed' ELSE a.outcome END AS state FROM tasks t LEFT JOIN task_cancellations c ON c.task_id = t.id LEFT JOIN task_attempts a ON a.task_id = t.id AND a.since = (SELECT MAX(since) FROM task_attempts WHERE task_id = t.id);
--> statement-breakpoint
CREATE VIEW grant_states AS SELECT r.id AS request_id, r.action_hash, r.kind, r.requested_at, a.expires_at, CASE WHEN s.request_id IS NOT NULL THEN 'spent' WHEN d.request_id IS NOT NULL THEN 'denied' WHEN a.request_id IS NULL THEN 'pending' ELSE 'approved' END AS state FROM grant_requests r LEFT JOIN grant_approvals a ON a.request_id = r.id LEFT JOIN grant_denials d ON d.request_id = r.id LEFT JOIN grant_spends s ON s.request_id = r.id;
--> statement-breakpoint
CREATE TRIGGER agent_handles_no_overlap BEFORE INSERT ON agent_handles BEGIN SELECT RAISE(ABORT, 'overlapping interval') WHERE EXISTS (SELECT 1 FROM agent_handles WHERE agent_id = NEW.agent_id AND NEW.since < COALESCE(until, 9223372036854775807) AND COALESCE(NEW.until, 9223372036854775807) > since); END;
--> statement-breakpoint
CREATE TRIGGER agent_processes_no_overlap BEFORE INSERT ON agent_processes BEGIN SELECT RAISE(ABORT, 'overlapping interval') WHERE EXISTS (SELECT 1 FROM agent_processes WHERE agent_id = NEW.agent_id AND NEW.since < COALESCE(until, 9223372036854775807) AND COALESCE(NEW.until, 9223372036854775807) > since); END;
--> statement-breakpoint
CREATE TRIGGER agent_spaces_no_overlap BEFORE INSERT ON agent_spaces BEGIN SELECT RAISE(ABORT, 'overlapping interval') WHERE EXISTS (SELECT 1 FROM agent_spaces WHERE agent_id = NEW.agent_id AND NEW.since < COALESCE(until, 9223372036854775807) AND COALESCE(NEW.until, 9223372036854775807) > since); END;
--> statement-breakpoint
CREATE TRIGGER agent_tunings_no_overlap BEFORE INSERT ON agent_tunings BEGIN SELECT RAISE(ABORT, 'overlapping interval') WHERE EXISTS (SELECT 1 FROM agent_tunings WHERE agent_id = NEW.agent_id AND NEW.since < COALESCE(until, 9223372036854775807) AND COALESCE(NEW.until, 9223372036854775807) > since); END;
--> statement-breakpoint
CREATE TRIGGER agent_leases_no_overlap BEFORE INSERT ON agent_leases BEGIN SELECT RAISE(ABORT, 'overlapping interval') WHERE EXISTS (SELECT 1 FROM agent_leases WHERE agent_id = NEW.agent_id AND NEW.since < COALESCE(until, 9223372036854775807) AND COALESCE(NEW.until, 9223372036854775807) > since); END;
--> statement-breakpoint
CREATE TRIGGER space_plexers_no_overlap BEFORE INSERT ON space_plexers BEGIN SELECT RAISE(ABORT, 'overlapping interval') WHERE EXISTS (SELECT 1 FROM space_plexers WHERE space_id = NEW.space_id AND NEW.since < COALESCE(until, 9223372036854775807) AND COALESCE(NEW.until, 9223372036854775807) > since); END;
--> statement-breakpoint
CREATE TRIGGER pack_plexers_no_overlap BEFORE INSERT ON pack_plexers BEGIN SELECT RAISE(ABORT, 'overlapping interval') WHERE EXISTS (SELECT 1 FROM pack_plexers WHERE pack_id = NEW.pack_id AND NEW.since < COALESCE(until, 9223372036854775807) AND COALESCE(NEW.until, 9223372036854775807) > since); END;
--> statement-breakpoint
CREATE TRIGGER host_plexers_no_overlap BEFORE INSERT ON host_plexers BEGIN SELECT RAISE(ABORT, 'overlapping interval') WHERE EXISTS (SELECT 1 FROM host_plexers WHERE host_id = NEW.host_id AND plexer_id = NEW.plexer_id AND NEW.since < COALESCE(until, 9223372036854775807) AND COALESCE(NEW.until, 9223372036854775807) > since); END;
--> statement-breakpoint
CREATE TRIGGER task_attempts_no_overlap BEFORE INSERT ON task_attempts BEGIN SELECT RAISE(ABORT, 'overlapping interval') WHERE EXISTS (SELECT 1 FROM task_attempts WHERE task_id = NEW.task_id AND NEW.since < COALESCE(until, 9223372036854775807) AND COALESCE(NEW.until, 9223372036854775807) > since); END;
--> statement-breakpoint
CREATE TRIGGER pack_intakes_no_overlap BEFORE INSERT ON pack_intakes BEGIN SELECT RAISE(ABORT, 'overlapping interval') WHERE EXISTS (SELECT 1 FROM pack_intakes WHERE pack_id = NEW.pack_id AND space_id = NEW.space_id AND NEW.since < COALESCE(until, 9223372036854775807) AND COALESCE(NEW.until, 9223372036854775807) > since); END;
