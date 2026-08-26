// Every DDL orch runs lives here and nowhere else: queue, ownership, outbox,
// spawn registry, session identities, model catalogues, the durable event log,
// and run history. The per-agent json and jsonl files stay the human-visible
// truth channel for presence and results; only this internal state lives here.

/** Stamped into `PRAGMA user_version`; a store carrying any other stamp is
 *  malformed and gets reaped and recreated empty. */
export const STORE_SCHEMA = 5;

export const QUEUE_DDL = `
    CREATE TABLE IF NOT EXISTS queue (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      opts TEXT NOT NULL,
      origin_workspace TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      state TEXT NOT NULL,
      retries INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      agent_key TEXT,
      dispatch_id TEXT,
      result TEXT
    );`;

export const OWNERSHIP_DDL = `
    CREATE TABLE IF NOT EXISTS ownership (
      agent_key TEXT PRIMARY KEY,
      owner TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`;

export const OUTBOX_DDL = `
    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY,
      target TEXT NOT NULL,
      payload TEXT NOT NULL,
      state TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      next_attempt_at INTEGER NOT NULL DEFAULT 0
    );`;

export const SPAWNED_DDL = `
    CREATE TABLE IF NOT EXISTS spawned (
      pane TEXT PRIMARY KEY,
      ts TEXT,
      adapter TEXT,
      model TEXT,
      backend TEXT,
      workspace TEXT,
      handle TEXT,
      name TEXT,
      cwd TEXT,
      worktree TEXT,
      branch TEXT,
      spawned_by TEXT,
      spawned_by_label TEXT
    );`;

export const SESSION_IDENTITIES_DDL = `
    CREATE TABLE IF NOT EXISTS session_identities (
      ancestor_pid INTEGER PRIMARY KEY,
      id TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind = 'session'),
      started_at TEXT NOT NULL
    );`;

export const CATALOGUES_DDL = `CREATE TABLE IF NOT EXISTS catalogues (command TEXT PRIMARY KEY, at INTEGER NOT NULL, stdout TEXT NOT NULL);`;

export const EVENTS_DDL = `CREATE TABLE IF NOT EXISTS events (seq INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, payload TEXT NOT NULL);`;

export const RUNS_DDL = `CREATE TABLE IF NOT EXISTS runs (dispatch_id TEXT PRIMARY KEY, agent_key TEXT NOT NULL, adapter TEXT, model TEXT, workspace TEXT, task TEXT, state TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT, tokens_in INTEGER, tokens_out INTEGER, cache_read INTEGER, cache_write INTEGER, cost REAL, turns INTEGER, result TEXT, last_error TEXT);`;

export const CORE_TABLE_DDL: readonly string[] = [
  QUEUE_DDL,
  OWNERSHIP_DDL,
  OUTBOX_DDL,
  SPAWNED_DDL,
  SESSION_IDENTITIES_DDL,
  CATALOGUES_DDL,
  EVENTS_DDL,
  RUNS_DDL,
  "CREATE INDEX IF NOT EXISTS queue_state_created ON queue(state, created_at);",
  "CREATE INDEX IF NOT EXISTS queue_agent_key ON queue(agent_key);",
  "CREATE INDEX IF NOT EXISTS outbox_pending ON outbox(state, next_attempt_at);",
  "CREATE INDEX IF NOT EXISTS runs_agent_started ON runs(agent_key, started_at);",
];
