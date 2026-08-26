import { openStore } from "./connection.ts";
import { nullableJsonText, setNonNullField } from "./row-values.ts";

export interface RunRecord {
  dispatchId: string;
  agentKey: string;
  adapter?: string;
  model?: string;
  workspace?: string;
  task?: string;
  state: string;
  startedAt: string;
  finishedAt?: string;
  tokensIn?: number;
  tokensOut?: number;
  cacheRead?: number;
  cacheWrite?: number;
  cost?: number;
  turns?: number;
  result?: unknown;
  lastError?: string;
}

interface RunRow {
  dispatch_id: string;
  agent_key: string;
  adapter: string | null;
  model: string | null;
  workspace: string | null;
  task: string | null;
  state: string;
  started_at: string;
  finished_at: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  cache_read: number | null;
  cache_write: number | null;
  cost: number | null;
  turns: number | null;
  result: string | null;
  last_error: string | null;
}

function rowToRun(row: RunRow): RunRecord {
  const run: RunRecord = {
    dispatchId: row.dispatch_id,
    agentKey: row.agent_key,
    state: row.state,
    startedAt: row.started_at,
  };
  setNonNullField(run, "adapter", row.adapter);
  setNonNullField(run, "model", row.model);
  setNonNullField(run, "workspace", row.workspace);
  setNonNullField(run, "task", row.task);
  setNonNullField(run, "finishedAt", row.finished_at);
  setNonNullField(run, "tokensIn", row.tokens_in);
  setNonNullField(run, "tokensOut", row.tokens_out);
  setNonNullField(run, "cacheRead", row.cache_read);
  setNonNullField(run, "cacheWrite", row.cache_write);
  setNonNullField(run, "cost", row.cost);
  setNonNullField(run, "turns", row.turns);
  setNonNullField(run, "result", row.result === null ? null : JSON.parse(row.result) as unknown);
  setNonNullField(run, "lastError", row.last_error);
  return run;
}

export function upsertRun(orchDir: string, run: RunRecord): void {
  openStore(orchDir)
    .query(
      `INSERT INTO runs (dispatch_id, agent_key, adapter, model, workspace, task, state, started_at, finished_at, tokens_in, tokens_out, cache_read, cache_write, cost, turns, result, last_error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(dispatch_id) DO UPDATE SET
         agent_key = excluded.agent_key, adapter = excluded.adapter, model = excluded.model,
         workspace = excluded.workspace, task = excluded.task, state = excluded.state,
         started_at = COALESCE(runs.started_at, excluded.started_at), finished_at = excluded.finished_at,
         tokens_in = excluded.tokens_in, tokens_out = excluded.tokens_out,
         cache_read = excluded.cache_read, cache_write = excluded.cache_write,
         cost = excluded.cost, turns = excluded.turns, result = excluded.result,
         last_error = excluded.last_error`,
    )
    .run(
      run.dispatchId,
      run.agentKey,
      run.adapter ?? null,
      run.model ?? null,
      run.workspace ?? null,
      run.task ?? null,
      run.state,
      run.startedAt,
      run.finishedAt ?? null,
      run.tokensIn ?? null,
      run.tokensOut ?? null,
      run.cacheRead ?? null,
      run.cacheWrite ?? null,
      run.cost ?? null,
      run.turns ?? null,
      nullableJsonText(run.result),
      run.lastError ?? null,
    );
}

export function selectRuns(orchDir: string, opts: { agentKey?: string; limit?: number } = {}): RunRecord[] {
  const params: unknown[] = [];
  let sql = "SELECT * FROM runs";
  if (opts.agentKey !== undefined) {
    sql += " WHERE agent_key = ?";
    params.push(opts.agentKey);
  }
  sql += " ORDER BY started_at DESC";
  if (opts.limit !== undefined) {
    sql += " LIMIT ?";
    params.push(opts.limit);
  }
  return (openStore(orchDir).query(sql).all(...params) as RunRow[]).map(rowToRun);
}

export function deleteRunsBefore(orchDir: string, cutoffIso: string): number {
  return openStore(orchDir).query("DELETE FROM runs WHERE started_at < ?").run(cutoffIso).changes;
}
