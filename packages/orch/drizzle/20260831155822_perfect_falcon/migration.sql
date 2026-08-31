CREATE TABLE `agent_endings` (
	`agent_id` text PRIMARY KEY,
	`ended_at` integer NOT NULL,
	`closed_by` text,
	CONSTRAINT `fk_agent_endings_agent_id_agents_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_agent_endings_closed_by_agents_id_fk` FOREIGN KEY (`closed_by`) REFERENCES `agents`(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_handles` (
	`agent_id` text NOT NULL,
	`since` integer NOT NULL,
	`until` integer,
	`handle` text NOT NULL,
	CONSTRAINT `agent_handles_pk` PRIMARY KEY(`agent_id`, `since`),
	CONSTRAINT `fk_agent_handles_agent_id_agents_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE,
	CONSTRAINT "agent_handles_interval" CHECK("until" IS NULL OR "until" > "since")
);
--> statement-breakpoint
CREATE TABLE `agent_leases` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`agent_id` text NOT NULL,
	`orch_id` text NOT NULL,
	`since` integer NOT NULL,
	`until` integer,
	`release_reason` text,
	CONSTRAINT `fk_agent_leases_agent_id_agents_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_agent_leases_orch_id_agents_id_fk` FOREIGN KEY (`orch_id`) REFERENCES `agents`(`id`),
	CONSTRAINT "agent_leases_reason" CHECK("release_reason" IS NULL OR "release_reason" IN ('released','handoff','adopted','expired')),
	CONSTRAINT "agent_leases_interval" CHECK("until" IS NULL OR "until" > "since"),
	CONSTRAINT "agent_leases_closed_has_reason" CHECK(("until" IS NULL) = ("release_reason" IS NULL)),
	CONSTRAINT "agent_leases_not_self" CHECK("orch_id" <> "agent_id")
);
--> statement-breakpoint
CREATE TABLE `agent_plexers` (
	`agent_id` text PRIMARY KEY,
	`plexer_id` text NOT NULL,
	CONSTRAINT `fk_agent_plexers_agent_id_agents_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_agent_plexers_plexer_id_plexers_id_fk` FOREIGN KEY (`plexer_id`) REFERENCES `plexers`(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_processes` (
	`agent_id` text NOT NULL,
	`since` integer NOT NULL,
	`until` integer,
	`host_id` text NOT NULL,
	`pid` integer NOT NULL,
	`start_token` text,
	CONSTRAINT `agent_processes_pk` PRIMARY KEY(`agent_id`, `since`),
	CONSTRAINT `fk_agent_processes_agent_id_agents_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_agent_processes_host_id_hosts_id_fk` FOREIGN KEY (`host_id`) REFERENCES `hosts`(`id`),
	CONSTRAINT "agent_processes_interval" CHECK("until" IS NULL OR "until" > "since")
);
--> statement-breakpoint
CREATE TABLE `agent_spaces` (
	`agent_id` text NOT NULL,
	`since` integer NOT NULL,
	`until` integer,
	`space_id` text NOT NULL,
	CONSTRAINT `agent_spaces_pk` PRIMARY KEY(`agent_id`, `since`),
	CONSTRAINT `fk_agent_spaces_agent_id_agents_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_agent_spaces_space_id_spaces_id_fk` FOREIGN KEY (`space_id`) REFERENCES `spaces`(`id`),
	CONSTRAINT "agent_spaces_interval" CHECK("until" IS NULL OR "until" > "since")
);
--> statement-breakpoint
CREATE TABLE `agent_tunings` (
	`agent_id` text NOT NULL,
	`since` integer NOT NULL,
	`until` integer,
	`model` text NOT NULL,
	`thinking` text,
	CONSTRAINT `agent_tunings_pk` PRIMARY KEY(`agent_id`, `since`),
	CONSTRAINT `fk_agent_tunings_agent_id_agents_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE,
	CONSTRAINT "agent_tunings_interval" CHECK("until" IS NULL OR "until" > "since")
);
--> statement-breakpoint
CREATE TABLE `agent_worktrees` (
	`agent_id` text PRIMARY KEY,
	`path` text NOT NULL,
	`branch` text NOT NULL,
	CONSTRAINT `fk_agent_worktrees_agent_id_agents_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `agents` (
	`id` text PRIMARY KEY,
	`spawned_by` text,
	`root_agent_id` text NOT NULL,
	`harness_id` text NOT NULL,
	`cwd` text NOT NULL,
	`name` text NOT NULL,
	`label` text,
	`session_token` text,
	`claimed_at` integer,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_agents_spawned_by_agents_id_fk` FOREIGN KEY (`spawned_by`) REFERENCES `agents`(`id`),
	CONSTRAINT `fk_agents_root_agent_id_agents_id_fk` FOREIGN KEY (`root_agent_id`) REFERENCES `agents`(`id`),
	CONSTRAINT `fk_agents_harness_id_harnesses_id_fk` FOREIGN KEY (`harness_id`) REFERENCES `harnesses`(`id`),
	CONSTRAINT "agents_not_self_spawned" CHECK("spawned_by" IS NULL OR "spawned_by" <> "id"),
	CONSTRAINT "agents_root_is_self" CHECK("spawned_by" IS NOT NULL OR "root_agent_id" = "id")
);
--> statement-breakpoint
CREATE TABLE `catalogues` (
	`command` text PRIMARY KEY,
	`at` integer NOT NULL,
	`stdout` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`seq` integer PRIMARY KEY AUTOINCREMENT,
	`ts` integer NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `grant_approvals` (
	`request_id` text PRIMARY KEY,
	`approved_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`host_id` text NOT NULL,
	CONSTRAINT `fk_grant_approvals_request_id_grant_requests_id_fk` FOREIGN KEY (`request_id`) REFERENCES `grant_requests`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_grant_approvals_host_id_hosts_id_fk` FOREIGN KEY (`host_id`) REFERENCES `hosts`(`id`),
	CONSTRAINT "grant_approvals_expiry" CHECK("expires_at" > "approved_at")
);
--> statement-breakpoint
CREATE TABLE `grant_denials` (
	`request_id` text PRIMARY KEY,
	`denied_at` integer NOT NULL,
	CONSTRAINT `fk_grant_denials_request_id_grant_requests_id_fk` FOREIGN KEY (`request_id`) REFERENCES `grant_requests`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `grant_request_params` (
	`request_id` text NOT NULL,
	`name` text NOT NULL,
	`value` text NOT NULL,
	CONSTRAINT `grant_request_params_pk` PRIMARY KEY(`request_id`, `name`),
	CONSTRAINT `fk_grant_request_params_request_id_grant_requests_id_fk` FOREIGN KEY (`request_id`) REFERENCES `grant_requests`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `grant_requests` (
	`id` text PRIMARY KEY,
	`action_hash` text NOT NULL,
	`kind` text NOT NULL,
	`requested_by` text,
	`requested_at` integer NOT NULL,
	CONSTRAINT `fk_grant_requests_requested_by_agents_id_fk` FOREIGN KEY (`requested_by`) REFERENCES `agents`(`id`)
);
--> statement-breakpoint
CREATE TABLE `grant_spends` (
	`request_id` text PRIMARY KEY,
	`spent_at` integer NOT NULL,
	`spent_by` text,
	CONSTRAINT `fk_grant_spends_request_id_grant_requests_id_fk` FOREIGN KEY (`request_id`) REFERENCES `grant_requests`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_grant_spends_spent_by_agents_id_fk` FOREIGN KEY (`spent_by`) REFERENCES `agents`(`id`)
);
--> statement-breakpoint
CREATE TABLE `harnesses` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`enabled_at` integer
);
--> statement-breakpoint
CREATE TABLE `host_plexers` (
	`host_id` text NOT NULL,
	`plexer_id` text NOT NULL,
	`since` integer NOT NULL,
	`until` integer,
	`version` text NOT NULL,
	CONSTRAINT `host_plexers_pk` PRIMARY KEY(`host_id`, `plexer_id`, `since`),
	CONSTRAINT `fk_host_plexers_host_id_hosts_id_fk` FOREIGN KEY (`host_id`) REFERENCES `hosts`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_host_plexers_plexer_id_plexers_id_fk` FOREIGN KEY (`plexer_id`) REFERENCES `plexers`(`id`),
	CONSTRAINT "host_plexers_interval" CHECK("until" IS NULL OR "until" > "since")
);
--> statement-breakpoint
CREATE TABLE `hosts` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`os` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "hosts_os" CHECK("os" IN ('linux','windows','darwin'))
);
--> statement-breakpoint
CREATE TABLE `outbox` (
	`id` text PRIMARY KEY,
	`target` text NOT NULL,
	`payload` text NOT NULL,
	`state` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`next_attempt_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pack_intakes` (
	`pack_id` text NOT NULL,
	`space_id` text NOT NULL,
	`since` integer NOT NULL,
	`until` integer,
	CONSTRAINT `pack_intakes_pk` PRIMARY KEY(`pack_id`, `space_id`, `since`),
	CONSTRAINT `fk_pack_intakes_pack_id_agents_id_fk` FOREIGN KEY (`pack_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_pack_intakes_space_id_spaces_id_fk` FOREIGN KEY (`space_id`) REFERENCES `spaces`(`id`) ON DELETE CASCADE,
	CONSTRAINT "pack_intakes_interval" CHECK("until" IS NULL OR "until" > "since")
);
--> statement-breakpoint
CREATE TABLE `pack_plexers` (
	`pack_id` text NOT NULL,
	`since` integer NOT NULL,
	`until` integer,
	`plexer_id` text NOT NULL,
	`handle` text NOT NULL,
	CONSTRAINT `pack_plexers_pk` PRIMARY KEY(`pack_id`, `since`),
	CONSTRAINT `fk_pack_plexers_pack_id_agents_id_fk` FOREIGN KEY (`pack_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_pack_plexers_plexer_id_plexers_id_fk` FOREIGN KEY (`plexer_id`) REFERENCES `plexers`(`id`),
	CONSTRAINT "pack_plexers_interval" CHECK("until" IS NULL OR "until" > "since")
);
--> statement-breakpoint
CREATE TABLE `plexers` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`enabled_at` integer
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`dispatch_id` text PRIMARY KEY,
	`agent_key` text NOT NULL,
	`adapter` text,
	`model` text,
	`space` text,
	`task` text,
	`state` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`tokens_in` integer,
	`tokens_out` integer,
	`cache_read` integer,
	`cache_write` integer,
	`cost` real,
	`turns` integer,
	`result` text,
	`last_error` text
);
--> statement-breakpoint
CREATE TABLE `space_plexers` (
	`space_id` text NOT NULL,
	`since` integer NOT NULL,
	`until` integer,
	`plexer_id` text NOT NULL,
	`handle` text NOT NULL,
	CONSTRAINT `space_plexers_pk` PRIMARY KEY(`space_id`, `since`),
	CONSTRAINT `fk_space_plexers_space_id_spaces_id_fk` FOREIGN KEY (`space_id`) REFERENCES `spaces`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_space_plexers_plexer_id_plexers_id_fk` FOREIGN KEY (`plexer_id`) REFERENCES `plexers`(`id`),
	CONSTRAINT "space_plexers_interval" CHECK("until" IS NULL OR "until" > "since")
);
--> statement-breakpoint
CREATE TABLE `spaces` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_spaces_created_by_agents_id_fk` FOREIGN KEY (`created_by`) REFERENCES `agents`(`id`)
);
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
	CONSTRAINT `task_attempts_pk` PRIMARY KEY(`task_id`, `since`),
	CONSTRAINT `fk_task_attempts_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_task_attempts_agent_id_agents_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`),
	CONSTRAINT "task_attempts_outcome" CHECK("outcome" IS NULL OR "outcome" IN ('done','failed')),
	CONSTRAINT "task_attempts_interval" CHECK("until" IS NULL OR "until" > "since"),
	CONSTRAINT "task_attempts_closed_has_outcome" CHECK(("until" IS NULL) = ("outcome" IS NULL)),
	CONSTRAINT "task_attempts_failed_has_error" CHECK("outcome" <> 'failed' OR "error" IS NOT NULL),
	CONSTRAINT "task_attempts_result_only_done" CHECK("outcome" = 'done' OR "result" IS NULL)
);
--> statement-breakpoint
CREATE TABLE `task_cancellations` (
	`task_id` text PRIMARY KEY,
	`cancelled_at` integer NOT NULL,
	`cancelled_by` text NOT NULL,
	CONSTRAINT `fk_task_cancellations_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_task_cancellations_cancelled_by_agents_id_fk` FOREIGN KEY (`cancelled_by`) REFERENCES `agents`(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY,
	`text` text NOT NULL,
	`opts` text NOT NULL,
	`enqueued_by` text NOT NULL,
	`scope_agent_id` text,
	`scope_pack_id` text,
	`scope_space_id` text,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_tasks_enqueued_by_agents_id_fk` FOREIGN KEY (`enqueued_by`) REFERENCES `agents`(`id`),
	CONSTRAINT `fk_tasks_scope_agent_id_agents_id_fk` FOREIGN KEY (`scope_agent_id`) REFERENCES `agents`(`id`),
	CONSTRAINT `fk_tasks_scope_pack_id_agents_id_fk` FOREIGN KEY (`scope_pack_id`) REFERENCES `agents`(`id`),
	CONSTRAINT `fk_tasks_scope_space_id_spaces_id_fk` FOREIGN KEY (`scope_space_id`) REFERENCES `spaces`(`id`),
	CONSTRAINT "tasks_exactly_one_scope" CHECK(("scope_agent_id" IS NOT NULL) + ("scope_pack_id" IS NOT NULL) + ("scope_space_id" IS NOT NULL) = 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_handle` ON `agent_handles` (`agent_id`) WHERE until IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `one_lease` ON `agent_leases` (`agent_id`) WHERE until IS NULL;--> statement-breakpoint
CREATE INDEX `leases_by_orch` ON `agent_leases` (`orch_id`) WHERE until IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `one_live_process` ON `agent_processes` (`agent_id`) WHERE until IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `one_space` ON `agent_spaces` (`agent_id`) WHERE until IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `one_tuning` ON `agent_tunings` (`agent_id`) WHERE until IS NULL;--> statement-breakpoint
CREATE INDEX `agents_by_pack` ON `agents` (`root_agent_id`);--> statement-breakpoint
CREATE INDEX `agents_by_spawner` ON `agents` (`spawned_by`);--> statement-breakpoint
CREATE UNIQUE INDEX `one_agent_per_session` ON `agents` (`session_token`);--> statement-breakpoint
CREATE INDEX `grants_by_action` ON `grant_requests` (`action_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `one_install` ON `host_plexers` (`host_id`,`plexer_id`) WHERE until IS NULL;--> statement-breakpoint
CREATE INDEX `outbox_pending` ON `outbox` (`state`,`next_attempt_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `one_intake` ON `pack_intakes` (`pack_id`,`space_id`) WHERE until IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `one_pack_home` ON `pack_plexers` (`pack_id`) WHERE until IS NULL;--> statement-breakpoint
CREATE INDEX `runs_agent_started` ON `runs` (`agent_key`,`started_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `one_space_home` ON `space_plexers` (`space_id`) WHERE until IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `one_open_attempt` ON `task_attempts` (`task_id`) WHERE until IS NULL;--> statement-breakpoint
CREATE INDEX `attempts_running` ON `task_attempts` (`agent_id`) WHERE until IS NULL;--> statement-breakpoint
CREATE INDEX `tasks_by_agent` ON `tasks` (`scope_agent_id`);--> statement-breakpoint
CREATE INDEX `tasks_by_pack` ON `tasks` (`scope_pack_id`);--> statement-breakpoint
CREATE INDEX `tasks_by_space` ON `tasks` (`scope_space_id`);--> statement-breakpoint
CREATE INDEX `tasks_by_enqueuer` ON `tasks` (`enqueued_by`);--> statement-breakpoint
CREATE VIEW `grant_states` AS select "grant_requests"."id" as "request_id", "grant_requests"."action_hash", "grant_requests"."kind", "grant_requests"."requested_at", "grant_approvals"."expires_at", CASE
    WHEN "grant_spends"."request_id" IS NOT NULL THEN 'spent'
    WHEN "grant_denials"."request_id" IS NOT NULL THEN 'denied'
    WHEN "grant_approvals"."request_id" IS NULL THEN 'pending'
    ELSE 'approved'
  END as "state" from "grant_requests" left join "grant_approvals" on "grant_approvals"."request_id" = "grant_requests"."id" left join "grant_denials" on "grant_denials"."request_id" = "grant_requests"."id" left join "grant_spends" on "grant_spends"."request_id" = "grant_requests"."id";--> statement-breakpoint
CREATE VIEW `task_states` AS select "tasks"."id" as "task_id", CASE
      WHEN "task_cancellations"."task_id" IS NOT NULL THEN 'cancelled'
      WHEN ((("attempt"."task_id" is null)) or (("attempt"."until" is null)) or ("attempt"."outcome" = 'failed')) AND ((((("tasks"."scope_agent_id" is not null)) and (exists (select 1 from "agent_endings" where "agent_endings"."agent_id" = "tasks"."scope_agent_id")))) or (((("tasks"."scope_pack_id" is not null)) and (not exists (select 1 from "agents" "packed" where (("packed"."root_agent_id" = "tasks"."scope_pack_id") and (not exists (select 1 from "agent_endings" where "agent_endings"."agent_id" = "packed"."id"))))))) or (((("tasks"."scope_space_id" is not null)) and (not exists (select 1 from "agents" "intaken" inner join "pack_intakes" on (("pack_intakes"."pack_id" = "intaken"."root_agent_id") and ("pack_intakes"."space_id" = "tasks"."scope_space_id") and (("pack_intakes"."until" is null))) where not exists (select 1 from "agent_endings" where "agent_endings"."agent_id" = "intaken"."id")))))) THEN 'unrunnable'
      WHEN "attempt"."task_id" IS NULL THEN 'queued'
      WHEN "attempt"."until" IS NULL THEN 'claimed'
      ELSE "attempt"."outcome"
    END as "state" from "tasks" left join "task_cancellations" on "task_cancellations"."task_id" = "tasks"."id" left join "task_attempts" "attempt" on (("attempt"."task_id" = "tasks"."id") and ("attempt"."since" = (SELECT MAX("latest"."since") FROM "task_attempts" "latest" WHERE "latest"."task_id" = "tasks"."id")));