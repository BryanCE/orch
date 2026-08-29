import { and, eq, exists, isNotNull, isNull, notExists, or, sql } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { QueryBuilder, alias, check, index, integer, primaryKey, real, sqliteTable, sqliteView, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Every table, typed.
 *
 * The ONE definition of the store: every table, index, check and view. Nothing
 * is declared on top of this file and nothing is applied beside it — drizzle-kit
 * generates the whole schema from here, and `connection.ts` only applies what it
 * generated.
 *
 * What this file buys is the thing raw sqlite cannot: results that are typed
 * instead of `unknown`, so no store module has to cast a row into shape. Rule 13
 * bans those casts and this is what removes the need for them.
 *
 * The two halves are pinned together by a test comparing these definitions to
 * `PRAGMA table_info` for every table, so a drift fails the gate rather than a
 * query at run time.
 */

// ── runtime operational tables ───────────────────────────────────────────────

export const ownership = sqliteTable("ownership", {
  agentKey: text("agent_key").primaryKey(),
  owner: text("owner").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const outbox = sqliteTable("outbox", {
  id: text("id").primaryKey(),
  target: text("target").notNull(),
  payload: text("payload").notNull(),
  state: text("state").notNull(),
  attempts: integer("attempts").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  nextAttemptAt: integer("next_attempt_at").notNull().default(0),
}, (table) => [index("outbox_pending").on(table.state, table.nextAttemptAt)]);

export const spawned = sqliteTable("spawned", {
  pane: text("pane").primaryKey(),
  ts: integer("ts"),
  adapter: text("adapter"),
  model: text("model"),
  backend: text("backend"),
  space: text("space"),
  handle: text("handle"),
  name: text("name"),
  cwd: text("cwd"),
  worktree: text("worktree"),
  branch: text("branch"),
  spawnedBy: text("spawned_by"),
  spawnedByLabel: text("spawned_by_label"),
});

export const catalogues = sqliteTable("catalogues", {
  command: text("command").primaryKey(),
  at: integer("at").notNull(),
  stdout: text("stdout").notNull(),
});

export const events = sqliteTable("events", {
  seq: integer("seq").primaryKey({ autoIncrement: true }),
  ts: integer("ts").notNull(),
  payload: text("payload").notNull(),
});

export const runs = sqliteTable("runs", {
  dispatchId: text("dispatch_id").primaryKey(),
  agentKey: text("agent_key").notNull(),
  adapter: text("adapter"),
  model: text("model"),
  space: text("space"),
  task: text("task"),
  state: text("state").notNull(),
  startedAt: integer("started_at").notNull(),
  finishedAt: integer("finished_at"),
  tokensIn: integer("tokens_in"),
  tokensOut: integer("tokens_out"),
  cacheRead: integer("cache_read"),
  cacheWrite: integer("cache_write"),
  cost: real("cost"),
  turns: integer("turns"),
  result: text("result"),
  lastError: text("last_error"),
}, (table) => [index("runs_agent_started").on(table.agentKey, table.startedAt)]);

// ── lookup tables ────────────────────────────────────────────────────────────

export const harnesses = sqliteTable("harnesses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  enabledAt: integer("enabled_at"),
});

export const plexers = sqliteTable("plexers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  enabledAt: integer("enabled_at"),
});

export const hosts = sqliteTable("hosts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  os: text("os").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [check("hosts_os", sql`${table.os} IN ('linux','windows','darwin')`)]);

export const hostPlexers = sqliteTable("host_plexers", {
  hostId: text("host_id").notNull().references(() => hosts.id, { onDelete: "cascade" }),
  plexerId: text("plexer_id").notNull().references(() => plexers.id),
  since: integer("since").notNull(),
  until: integer("until"),
  version: text("version").notNull(),
}, (table) => [
  primaryKey({ columns: [table.hostId, table.plexerId, table.since] }),
  uniqueIndex("one_install").on(table.hostId, table.plexerId).where(sql`until IS NULL`),
  check("host_plexers_interval", sql`${table.until} IS NULL OR ${table.until} > ${table.since}`),
]);

export const spaces = sqliteTable("spaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdBy: text("created_by").references((): AnySQLiteColumn => agents.id),
  createdAt: integer("created_at").notNull(),
});

// ── the agent hub ────────────────────────────────────────────────────────────

export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(),
  spawnedBy: text("spawned_by").references((): AnySQLiteColumn => agents.id),
  rootAgentId: text("root_agent_id").notNull().references((): AnySQLiteColumn => agents.id),
  harnessId: text("harness_id").notNull().references(() => harnesses.id),
  cwd: text("cwd").notNull(),
  name: text("name").notNull(),
  label: text("label"),
  /** IMMUTABLE. The harness session this agent IS, as that harness names it
   *  (`AgentAdapter.sessionIdEnv`). It is the only stable key a driving session
   *  has: the `orch` CLI is short-lived, so anything derived from the process
   *  tree mints a new identity on every invocation. NULL = not a harness
   *  session (a spawned worker), never a sentinel. */
  sessionToken: text("session_token"),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index("agents_by_pack").on(table.rootAgentId),
  index("agents_by_spawner").on(table.spawnedBy),
  uniqueIndex("one_agent_per_session").on(table.sessionToken),
  check("agents_not_self_spawned", sql`${table.spawnedBy} IS NULL OR ${table.spawnedBy} <> ${table.id}`),
  check("agents_root_is_self", sql`${table.spawnedBy} IS NOT NULL OR ${table.rootAgentId} = ${table.id}`),
]);

// ── facts only some agents have ──────────────────────────────────────────────

export const agentWorktrees = sqliteTable("agent_worktrees", {
  agentId: text("agent_id").primaryKey().references(() => agents.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  branch: text("branch").notNull(),
});

export const agentEndings = sqliteTable("agent_endings", {
  agentId: text("agent_id").primaryKey().references(() => agents.id, { onDelete: "cascade" }),
  endedAt: integer("ended_at").notNull(),
  closedBy: text("closed_by").references(() => agents.id),
});

export const agentPlexers = sqliteTable("agent_plexers", {
  agentId: text("agent_id").primaryKey().references(() => agents.id, { onDelete: "cascade" }),
  plexerId: text("plexer_id").notNull().references(() => plexers.id),
});

// ── satellites: one independently-varying fact over one timeline ─────────────

export const agentProcesses = sqliteTable("agent_processes", {
  agentId: text("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  since: integer("since").notNull(),
  until: integer("until"),
  hostId: text("host_id").notNull().references(() => hosts.id),
  pid: integer("pid").notNull(),
  startToken: text("start_token"),
}, (table) => [
  primaryKey({ columns: [table.agentId, table.since] }),
  uniqueIndex("one_live_process").on(table.agentId).where(sql`until IS NULL`),
  check("agent_processes_interval", sql`${table.until} IS NULL OR ${table.until} > ${table.since}`),
]);

export const agentHandles = sqliteTable("agent_handles", {
  agentId: text("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  since: integer("since").notNull(),
  until: integer("until"),
  handle: text("handle").notNull(),
}, (table) => [
  primaryKey({ columns: [table.agentId, table.since] }),
  uniqueIndex("one_handle").on(table.agentId).where(sql`until IS NULL`),
  check("agent_handles_interval", sql`${table.until} IS NULL OR ${table.until} > ${table.since}`),
]);

export const agentSpaces = sqliteTable("agent_spaces", {
  agentId: text("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  since: integer("since").notNull(),
  until: integer("until"),
  spaceId: text("space_id").notNull().references(() => spaces.id),
}, (table) => [
  primaryKey({ columns: [table.agentId, table.since] }),
  uniqueIndex("one_space").on(table.agentId).where(sql`until IS NULL`),
  check("agent_spaces_interval", sql`${table.until} IS NULL OR ${table.until} > ${table.since}`),
]);

export const agentTunings = sqliteTable("agent_tunings", {
  agentId: text("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  since: integer("since").notNull(),
  until: integer("until"),
  model: text("model").notNull(),
  thinking: text("thinking"),
}, (table) => [
  primaryKey({ columns: [table.agentId, table.since] }),
  uniqueIndex("one_tuning").on(table.agentId).where(sql`until IS NULL`),
  check("agent_tunings_interval", sql`${table.until} IS NULL OR ${table.until} > ${table.since}`),
]);

export const agentLeases = sqliteTable("agent_leases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: text("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  orchId: text("orch_id").notNull().references(() => agents.id),
  since: integer("since").notNull(),
  until: integer("until"),
  releaseReason: text("release_reason"),
}, (table) => [
  uniqueIndex("one_lease").on(table.agentId).where(sql`until IS NULL`),
  index("leases_by_orch").on(table.orchId).where(sql`until IS NULL`),
  check("agent_leases_reason", sql`${table.releaseReason} IS NULL OR ${table.releaseReason} IN ('released','handoff','adopted','expired')`),
  check("agent_leases_interval", sql`${table.until} IS NULL OR ${table.until} > ${table.since}`),
  check("agent_leases_closed_has_reason", sql`(${table.until} IS NULL) = (${table.releaseReason} IS NULL)`),
  check("agent_leases_not_self", sql`${table.orchId} <> ${table.agentId}`),
]);

// ── where groupings live ─────────────────────────────────────────────────────

export const spacePlexers = sqliteTable("space_plexers", {
  spaceId: text("space_id").notNull().references(() => spaces.id, { onDelete: "cascade" }),
  since: integer("since").notNull(),
  until: integer("until"),
  plexerId: text("plexer_id").notNull().references(() => plexers.id),
  handle: text("handle").notNull(),
}, (table) => [
  primaryKey({ columns: [table.spaceId, table.since] }),
  uniqueIndex("one_space_home").on(table.spaceId).where(sql`until IS NULL`),
  check("space_plexers_interval", sql`${table.until} IS NULL OR ${table.until} > ${table.since}`),
]);

export const packPlexers = sqliteTable("pack_plexers", {
  packId: text("pack_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  since: integer("since").notNull(),
  until: integer("until"),
  plexerId: text("plexer_id").notNull().references(() => plexers.id),
  handle: text("handle").notNull(),
}, (table) => [
  primaryKey({ columns: [table.packId, table.since] }),
  uniqueIndex("one_pack_home").on(table.packId).where(sql`until IS NULL`),
  check("pack_plexers_interval", sql`${table.until} IS NULL OR ${table.until} > ${table.since}`),
]);

export const packIntakes = sqliteTable("pack_intakes", {
  packId: text("pack_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  spaceId: text("space_id").notNull().references(() => spaces.id, { onDelete: "cascade" }),
  since: integer("since").notNull(),
  until: integer("until"),
}, (table) => [
  primaryKey({ columns: [table.packId, table.spaceId, table.since] }),
  uniqueIndex("one_intake").on(table.packId, table.spaceId).where(sql`until IS NULL`),
  check("pack_intakes_interval", sql`${table.until} IS NULL OR ${table.until} > ${table.since}`),
]);

// ── work ─────────────────────────────────────────────────────────────────────

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  text: text("text").notNull(),
  opts: text("opts").notNull(),
  enqueuedBy: text("enqueued_by").notNull().references(() => agents.id),
  scopeAgentId: text("scope_agent_id").references(() => agents.id),
  scopePackId: text("scope_pack_id").references(() => agents.id),
  scopeSpaceId: text("scope_space_id").references(() => spaces.id),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index("tasks_by_agent").on(table.scopeAgentId),
  index("tasks_by_pack").on(table.scopePackId),
  index("tasks_by_space").on(table.scopeSpaceId),
  index("tasks_by_enqueuer").on(table.enqueuedBy),
  check(
    "tasks_exactly_one_scope",
    sql`(${table.scopeAgentId} IS NOT NULL) + (${table.scopePackId} IS NOT NULL) + (${table.scopeSpaceId} IS NOT NULL) = 1`,
  ),
]);

export const taskCancellations = sqliteTable("task_cancellations", {
  taskId: text("task_id").primaryKey().references(() => tasks.id, { onDelete: "cascade" }),
  cancelledAt: integer("cancelled_at").notNull(),
  cancelledBy: text("cancelled_by").notNull().references(() => agents.id),
});

export const taskAttempts = sqliteTable("task_attempts", {
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  since: integer("since").notNull(),
  until: integer("until"),
  agentId: text("agent_id").notNull().references(() => agents.id),
  dispatchId: text("dispatch_id").notNull(),
  outcome: text("outcome"),
  result: text("result"),
  error: text("error"),
}, (table) => [
  primaryKey({ columns: [table.taskId, table.since] }),
  uniqueIndex("one_open_attempt").on(table.taskId).where(sql`until IS NULL`),
  index("attempts_running").on(table.agentId).where(sql`until IS NULL`),
  check("task_attempts_outcome", sql`${table.outcome} IS NULL OR ${table.outcome} IN ('done','failed')`),
  check("task_attempts_interval", sql`${table.until} IS NULL OR ${table.until} > ${table.since}`),
  check("task_attempts_closed_has_outcome", sql`(${table.until} IS NULL) = (${table.outcome} IS NULL)`),
  check("task_attempts_failed_has_error", sql`${table.outcome} <> 'failed' OR ${table.error} IS NOT NULL`),
  check("task_attempts_result_only_done", sql`${table.outcome} = 'done' OR ${table.result} IS NULL`),
]);

// ── human consent ────────────────────────────────────────────────────────────

export const grantRequests = sqliteTable("grant_requests", {
  id: text("id").primaryKey(),
  actionHash: text("action_hash").notNull(),
  kind: text("kind").notNull(),
  requestedBy: text("requested_by").references(() => agents.id),
  requestedAt: integer("requested_at").notNull(),
}, (table) => [index("grants_by_action").on(table.actionHash)]);

export const grantRequestParams = sqliteTable("grant_request_params", {
  requestId: text("request_id").notNull().references(() => grantRequests.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  value: text("value").notNull(),
}, (table) => [primaryKey({ columns: [table.requestId, table.name] })]);

export const grantApprovals = sqliteTable("grant_approvals", {
  requestId: text("request_id").primaryKey().references(() => grantRequests.id, { onDelete: "cascade" }),
  approvedAt: integer("approved_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  hostId: text("host_id").notNull().references(() => hosts.id),
}, (table) => [check("grant_approvals_expiry", sql`${table.expiresAt} > ${table.approvedAt}`)]);

export const grantDenials = sqliteTable("grant_denials", {
  requestId: text("request_id").primaryKey().references(() => grantRequests.id, { onDelete: "cascade" }),
  deniedAt: integer("denied_at").notNull(),
});

export const grantSpends = sqliteTable("grant_spends", {
  requestId: text("request_id").primaryKey().references(() => grantRequests.id, { onDelete: "cascade" }),
  spentAt: integer("spent_at").notNull(),
  spentBy: text("spent_by").references(() => agents.id),
});

// ── derived states ───────────────────────────────────────────────────────────

/** Every agent whose ending row is absent — the only definition of "still
 *  running" this schema has. Both scope checks below are the same question
 *  asked of a different set of agents. */
function stillRunning(agent: typeof agents): ReturnType<typeof notExists> {
  return notExists(new QueryBuilder().select({ one: sql`1` }).from(agentEndings).where(eq(agentEndings.agentId, agent.id)));
}

/**
 * The state of a task, read off the rows that record what happened to it.
 *
 * Cancellation wins over everything. A task whose scope has no agent left alive
 * is unrunnable rather than queued: nothing can ever claim it, and saying so is
 * the difference between a queue that drains and one that looks busy forever.
 */
export const taskStates = sqliteView("task_states").as((qb) => {
  const attempt = alias(taskAttempts, "attempt");
  const latest = alias(taskAttempts, "latest");
  const packed = alias(agents, "packed");
  const intaken = alias(agents, "intaken");

  const unclaimable = or(isNull(attempt.taskId), isNull(attempt.until), eq(attempt.outcome, "failed"));
  const scopeIsGone = or(
    and(isNotNull(tasks.scopeAgentId), exists(
      new QueryBuilder().select({ one: sql`1` }).from(agentEndings).where(eq(agentEndings.agentId, tasks.scopeAgentId)),
    )),
    and(isNotNull(tasks.scopePackId), notExists(
      new QueryBuilder().select({ one: sql`1` }).from(packed)
        .where(and(eq(packed.rootAgentId, tasks.scopePackId), stillRunning(packed))),
    )),
    and(isNotNull(tasks.scopeSpaceId), notExists(
      new QueryBuilder().select({ one: sql`1` }).from(intaken)
        .innerJoin(packIntakes, and(
          eq(packIntakes.packId, intaken.rootAgentId),
          eq(packIntakes.spaceId, tasks.scopeSpaceId),
          isNull(packIntakes.until),
        ))
        .where(stillRunning(intaken)),
    )),
  );

  return qb.select({
    taskId: tasks.id,
    state: sql<string>`CASE
      WHEN ${taskCancellations.taskId} IS NOT NULL THEN 'cancelled'
      WHEN ${unclaimable} AND ${scopeIsGone} THEN 'unrunnable'
      WHEN ${attempt.taskId} IS NULL THEN 'queued'
      WHEN ${attempt.until} IS NULL THEN 'claimed'
      ELSE ${attempt.outcome}
    END`.as("state"),
  })
    .from(tasks)
    .leftJoin(taskCancellations, eq(taskCancellations.taskId, tasks.id))
    .leftJoin(attempt, and(
      eq(attempt.taskId, tasks.id),
      eq(attempt.since, sql`(SELECT MAX(${latest.since}) FROM ${taskAttempts} ${latest} WHERE ${latest.taskId} = ${tasks.id})`),
    ));
});

/** The state of a grant request, read off the approval, denial and spend rows.
 *  Expiry is absent on purpose: it depends on the clock, and a view that reads
 *  the clock answers differently for unchanged rows. Callers compare
 *  `expires_at` themselves at the instant they spend. */
export const grantStates = sqliteView("grant_states").as((qb) => qb.select({
  requestId: grantRequests.id,
  actionHash: grantRequests.actionHash,
  kind: grantRequests.kind,
  requestedAt: grantRequests.requestedAt,
  expiresAt: grantApprovals.expiresAt,
  state: sql<string>`CASE
    WHEN ${grantSpends.requestId} IS NOT NULL THEN 'spent'
    WHEN ${grantDenials.requestId} IS NOT NULL THEN 'denied'
    WHEN ${grantApprovals.requestId} IS NULL THEN 'pending'
    ELSE 'approved'
  END`.as("state"),
})
  .from(grantRequests)
  .leftJoin(grantApprovals, eq(grantApprovals.requestId, grantRequests.id))
  .leftJoin(grantDenials, eq(grantDenials.requestId, grantRequests.id))
  .leftJoin(grantSpends, eq(grantSpends.requestId, grantRequests.id)));
