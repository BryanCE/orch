import { isAdapterId, type AdapterId } from "../adapters/adapter.ts";
import { isBackendId, type BackendId } from "../backends/backend.ts";
import { openStore } from "./connection.ts";
import { setNonNullField } from "./row-values.ts";

export interface SpawnedRecord {
  /** Primary registry id: the agent's serialized identity key. */
  pane: string;
  ts?: string;
  adapter?: AdapterId;
  model?: string;
  backend?: BackendId;
  /** Identity workspace assigned by the spawning backend. */
  workspace?: string;
  /** Backend-native control handle (herdr/tmux pane id) for close/focus/send-keys. */
  handle?: string;
  /** Mutable display name. NOT identity — renaming it must never change `pane`. */
  name?: string;
  /** Working directory the agent launched in. */
  cwd?: string;
  worktree?: string;
  branch?: string;
  /** Orchestrator ownership token stamped at spawn time. */
  owner?: string;
  /** Address of the exact session that spawned this pane; `owner` only names the workspace operator. */
  spawnedBy?: string;
  /** Human description of the spawning session ("lead-1 (pi)", "claude session"). */
  spawnedByLabel?: string;
}

interface SpawnedRow {
  pane: string;
  ts: string | null;
  adapter: string | null;
  model: string | null;
  backend: string | null;
  workspace: string | null;
  handle: string | null;
  name: string | null;
  cwd: string | null;
  worktree: string | null;
  branch: string | null;
  spawned_by: string | null;
  spawned_by_label: string | null;
  owner: string | null;
}

function rowToSpawned(row: SpawnedRow): SpawnedRecord {
  const record: SpawnedRecord = { pane: row.pane };
  setNonNullField(record, "ts", row.ts);
  // A row naming a provider this orch does not ship is malformed, not a version
  // to support (Rule 8): drop the field so callers take their unknown-provider path.
  if (isAdapterId(row.adapter)) record.adapter = row.adapter;
  setNonNullField(record, "model", row.model);
  if (isBackendId(row.backend)) record.backend = row.backend;
  setNonNullField(record, "workspace", row.workspace);
  setNonNullField(record, "handle", row.handle);
  setNonNullField(record, "name", row.name);
  setNonNullField(record, "cwd", row.cwd);
  setNonNullField(record, "worktree", row.worktree);
  setNonNullField(record, "branch", row.branch);
  setNonNullField(record, "spawnedBy", row.spawned_by);
  setNonNullField(record, "spawnedByLabel", row.spawned_by_label);
  setNonNullField(record, "owner", row.owner);
  return record;
}

/** Upsert by pane: a later spawn of the same pane replaces the earlier record. */
export function insertSpawnedRecord(orchDir: string, record: SpawnedRecord): void {
  openStore(orchDir)
    .query(
      `INSERT INTO spawned (pane, ts, adapter, model, backend, workspace, handle, name, cwd, worktree, branch, spawned_by, spawned_by_label)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(pane) DO UPDATE SET
         ts = excluded.ts, adapter = excluded.adapter, model = excluded.model,
         backend = excluded.backend, workspace = excluded.workspace, handle = excluded.handle,
         name = excluded.name, cwd = excluded.cwd,
         worktree = excluded.worktree, branch = excluded.branch,
         spawned_by = excluded.spawned_by, spawned_by_label = excluded.spawned_by_label`,
    )
    .run(
      record.pane,
      record.ts ?? null,
      record.adapter ?? null,
      record.model ?? null,
      record.backend ?? null,
      record.workspace ?? null,
      record.handle ?? null,
      record.name ?? null,
      record.cwd ?? null,
      record.worktree ?? null,
      record.branch ?? null,
      record.spawnedBy ?? null,
      record.spawnedByLabel ?? null,
    );
}

const SPAWNED_SELECT = `SELECT spawned.pane, spawned.ts, spawned.adapter, spawned.model, spawned.backend,
            spawned.workspace, spawned.handle, spawned.name, spawned.cwd, spawned.worktree,
            spawned.branch, spawned.spawned_by, spawned.spawned_by_label,
            ownership.owner AS owner
     FROM spawned
     LEFT JOIN ownership ON ownership.agent_key = spawned.pane`;

export function selectSpawnedRecords(orchDir: string): SpawnedRecord[] {
  const rows = openStore(orchDir).query(SPAWNED_SELECT).all() as SpawnedRow[];
  return rows.map(rowToSpawned);
}

export function selectSpawnedRecord(orchDir: string, pane: string): SpawnedRecord | null {
  const row = openStore(orchDir).query(`${SPAWNED_SELECT} WHERE spawned.pane = ?`).get(pane) as SpawnedRow | undefined;
  return row ? rowToSpawned(row) : null;
}

/** Relabel an agent. The name is a mutable column; the key it sits beside is not. */
export function writeSpawnedName(orchDir: string, pane: string, name: string): boolean {
  return openStore(orchDir).query("UPDATE spawned SET name = ? WHERE pane = ?").run(name, pane).changes === 1;
}

export function deleteSpawnedRecord(orchDir: string, pane: string): void {
  openStore(orchDir).query("DELETE FROM spawned WHERE pane = ?").run(pane);
}
