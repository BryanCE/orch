// The DDL drizzle-kit cannot emit. Tables, columns, indexes and CHECKs are
// declared once in `tables.ts` and generated into `drizzle/`; SQLite views and
// triggers have no drizzle builder, so they are written here and appended to the
// generated migration by `bun db:gen`. Nothing here duplicates a table.

export interface UnemittedStatement {
  /** The object this statement creates, so a re-run can tell it already exists. */
  readonly name: string;
  readonly sql: string;
}

const TASK_STATES: UnemittedStatement = {
  name: "task_states",
  sql: `CREATE VIEW task_states AS SELECT t.id AS task_id, CASE WHEN c.task_id IS NOT NULL THEN 'cancelled' WHEN (a.task_id IS NULL OR a.until IS NULL OR a.outcome = 'failed') AND ((t.scope_agent_id IS NOT NULL AND EXISTS (SELECT 1 FROM agent_endings e WHERE e.agent_id = t.scope_agent_id)) OR (t.scope_pack_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM agents a_live WHERE a_live.root_agent_id = t.scope_pack_id AND NOT EXISTS (SELECT 1 FROM agent_endings e_live WHERE e_live.agent_id = a_live.id))) OR (t.scope_space_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM agents a_live JOIN pack_intakes i ON i.pack_id = a_live.root_agent_id AND i.space_id = t.scope_space_id AND i.until IS NULL WHERE NOT EXISTS (SELECT 1 FROM agent_endings e_live WHERE e_live.agent_id = a_live.id)))) THEN 'unrunnable' WHEN a.task_id IS NULL THEN 'queued' WHEN a.until IS NULL THEN 'claimed' ELSE a.outcome END AS state FROM tasks t LEFT JOIN task_cancellations c ON c.task_id = t.id LEFT JOIN task_attempts a ON a.task_id = t.id AND a.since = (SELECT MAX(since) FROM task_attempts WHERE task_id = t.id);`,
};

// Expiry is deliberately absent: it depends on the clock, and a view that reads
// the clock reports a different answer for the same rows. Callers compare
// `expires_at` themselves at the instant they spend.
const GRANT_STATES: UnemittedStatement = {
  name: "grant_states",
  sql: `CREATE VIEW grant_states AS SELECT r.id AS request_id, r.action_hash, r.kind, r.requested_at, a.expires_at, CASE WHEN s.request_id IS NOT NULL THEN 'spent' WHEN d.request_id IS NOT NULL THEN 'denied' WHEN a.request_id IS NULL THEN 'pending' ELSE 'approved' END AS state FROM grant_requests r LEFT JOIN grant_approvals a ON a.request_id = r.id LEFT JOIN grant_denials d ON d.request_id = r.id LEFT JOIN grant_spends s ON s.request_id = r.id;`,
};

/** Appended to the generated migration in this order: views first, so a trigger
 *  may read one, then the interval guards. */
/**
 * The objects drizzle-kit has no builder for. Views only.
 *
 * There were also ten `<table>_no_overlap` triggers here, rejecting an interval
 * that overlapped a live one. Every table they guarded already carries a
 * `uniqueIndex(...).where(until IS NULL)` that drizzle-kit emits natively, and
 * that index IS the guarantee (TASKS/02-scope.md I7). All the triggers added was
 * rejection of two overlapping CLOSED intervals, which no writer can produce:
 * `until` is stamped when the event happens and nothing back-dates it.
 */
export const UNEMITTED_DDL: readonly UnemittedStatement[] = [TASK_STATES, GRANT_STATES];
