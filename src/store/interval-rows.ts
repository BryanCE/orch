import { openStore } from "./connection.ts";

/** Narrow database port used by the interval satellites. */
export interface IntervalDatabase {
  exec(sql: string): void;
  query(sql: string): { run(...params: unknown[]): { changes: number }; all(...params: unknown[]): unknown[]; get(...params: unknown[]): unknown };
}

type Satellite = "agent_processes" | "agent_handles" | "agent_spaces" | "agent_tunings";
type StoreRef = IntervalDatabase | string;
function resolveStore(ref: StoreRef): IntervalDatabase { return typeof ref === "string" ? openStore(ref) : ref; }
const columns: Record<Satellite, string> = {
  agent_processes: "host_id, pid, start_token",
  agent_handles: "handle",
  agent_spaces: "space_id",
  agent_tunings: "model, thinking",
};

function transaction<T>(db: IntervalDatabase, body: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try { const result = body(); db.exec("COMMIT"); return result; }
  catch (error) { try { db.exec("ROLLBACK"); } catch {} throw error; }
}

/** Close the current interval and insert its successor as one atomic operation. */
export function closeThenOpen<T extends Satellite>(db: IntervalDatabase, table: T, agentId: string, now: number, values: Record<string, unknown>): void {
  const cols = columns[table];
  const names = cols.split(", ");
  const params = names.map((name) => values[name]);
  transaction(db, () => {
    db.query(`UPDATE ${table} SET until = ? WHERE agent_id = ? AND until IS NULL`).run(now, agentId);
    db.query(`INSERT INTO ${table} (agent_id, since, until, ${cols}) VALUES (?, ?, NULL, ${names.map(() => "?").join(", ")})`).run(agentId, now, ...params);
  });
}

export interface ProcessValues { hostId: string; pid: number; startToken?: string | null }
export interface TuningValues { model: string; thinking?: string | null }

export function recordProcess(ref: StoreRef, agentId: string, now: number, values: ProcessValues): void {
  const db = resolveStore(ref);
  closeThenOpen(db, "agent_processes", agentId, now, { host_id: values.hostId, pid: values.pid, start_token: values.startToken ?? null });
}
export function endProcess(ref: StoreRef, agentId: string, now: number): void {
  const db = resolveStore(ref);
  transaction(db, () => { db.query("UPDATE agent_processes SET until = ? WHERE agent_id = ? AND until IS NULL").run(now, agentId); });
}
export function setHandle(ref: StoreRef, agentId: string, now: number, handle: string): void { closeThenOpen(resolveStore(ref), "agent_handles", agentId, now, { handle }); }
export function setSpace(ref: StoreRef, agentId: string, now: number, spaceId: string): void { closeThenOpen(resolveStore(ref), "agent_spaces", agentId, now, { space_id: spaceId }); }
export function clearSpace(ref: StoreRef, agentId: string, now: number): void {
  const db = resolveStore(ref);
  transaction(db, () => { db.query("UPDATE agent_spaces SET until = ? WHERE agent_id = ? AND until IS NULL").run(now, agentId); });
}
export function setTuning(ref: StoreRef, agentId: string, now: number, values: TuningValues): void { closeThenOpen(resolveStore(ref), "agent_tunings", agentId, now, { model: values.model, thinking: values.thinking ?? null }); }
export function setAgentPlexer(ref: StoreRef, agentId: string, plexerId: string): void {
  resolveStore(ref).query("INSERT INTO agent_plexers (agent_id, plexer_id) VALUES (?, ?)").run(agentId, plexerId);
}

type Row = Record<string, unknown>;
function current(db: IntervalDatabase, table: string, agentId: string): Row | null {
  return (db.query(`SELECT * FROM ${table} WHERE agent_id = ? AND until IS NULL`).get(agentId) as Row | undefined) ?? null;
}
export function currentProcess(ref: StoreRef, agentId: string): Row | null { return current(resolveStore(ref), "agent_processes", agentId); }
export function currentHandle(ref: StoreRef, agentId: string): Row | null { return current(resolveStore(ref), "agent_handles", agentId); }
export function currentSpace(ref: StoreRef, agentId: string): Row | null { return current(resolveStore(ref), "agent_spaces", agentId); }
export function currentTuning(ref: StoreRef, agentId: string): Row | null { return current(resolveStore(ref), "agent_tunings", agentId); }
