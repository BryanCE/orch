import type { OrchDir } from "../types/core.ts";
import { and, eq, isNull } from "drizzle-orm";
import { orm, withTransaction, type Orm } from "./connection.ts";
import { refreshAgent } from "./agent-view.ts";
import { agentForms, agentHandles, agentHosts, agentPlexers, agentProcesses, agentSpaces, agentTunings, agentWorktrees } from "../db/schema.ts";
import type { TuningValues } from "../types/store.ts";
import type { FormId } from "../types/form.ts";
import type { HostedProcess, ProcessInstance } from "../types/process.ts";
import type { AgentId, AgentLocation, HereAgent } from "../types/agent-place.ts";
import type { HostId } from "../types/host.ts";

/**
 * The four axes an agent carries on its own timeline.
 *
 * Each is an interval table: `[since, until)`, at most one row open at a time.
 * Writing one is CLOSE-THEN-OPEN in a transaction, because the half-open
 * intervals must meet exactly — an open row beside another is what the
 * `one_live_*` unique indexes refuse.
 */
/** An agent's recorded process: on the host its open `agent_hosts` row names, and since when
 *  orch recorded it. The process row carries no host of its own: a process runs where its
 *  agent runs. */
export interface StoredProcess extends HostedProcess { readonly since: number }

export type HandleRow = typeof agentHandles.$inferSelect;
export type AgentSpaceRow = typeof agentSpaces.$inferSelect;
export type TuningRow = typeof agentTunings.$inferSelect;

type IntervalTable = typeof agentHosts | typeof agentProcesses | typeof agentHandles | typeof agentSpaces | typeof agentTunings | typeof agentPlexers | typeof agentForms;

/** Close the open row and answer the instant it closed at, which is where the
 *  next row opens. `until > since` forbids closing a row at its own start, so
 *  a row opened this same millisecond closes one later. */
function closeOpen(db: Orm, table: IntervalTable, agentId: string, now: number): number {
  const open = db.select({ since: table.since }).from(table)
    .where(and(eq(table.agentId, agentId), isNull(table.until))).get();
  if (open === undefined) return now;
  const closesAt = Math.max(now, open.since + 1);
  db.update(table).set({ until: closesAt })
    .where(and(eq(table.agentId, agentId), isNull(table.until))).run();
  return closesAt;
}

/** Open the agent's first `agent_hosts` row, with its own row. */
export function openLocationIn(db: Orm, agentId: string, since: number, host: HostId, cwd: string): void {
  db.insert(agentHosts).values({ agentId, since, until: null, hostId: host, cwd }).run();
}

/** Move an agent to another host and directory: its open row closes as the next opens. What
 *  only means something on the machine it was read on goes with the old host: the handle
 *  and plexer intervals close, and the worktree row goes. */
export function relocateIn(db: Orm, agentId: string, now: number, host: HostId, cwd: string): void {
  const before = openLocationOf(db, agentId);
  const since = closeOpen(db, agentHosts, agentId, now);
  openLocationIn(db, agentId, since, host, cwd);
  if (before === undefined || before.host === host) return;
  closeOpen(db, agentHandles, agentId, now);
  closeOpen(db, agentPlexers, agentId, now);
  db.delete(agentWorktrees).where(eq(agentWorktrees.agentId, agentId)).run();
}

function openLocationOf(db: Orm, agentId: string): AgentLocation | undefined {
  return db.select({ host: agentHosts.hostId, cwd: agentHosts.cwd, since: agentHosts.since }).from(agentHosts)
    .where(and(eq(agentHosts.agentId, agentId), isNull(agentHosts.until))).get();
}

/** An agent's open `agent_hosts` row; undefined only when no agent has this id, since every
 *  agent row is written with one. */
export function agentLocation(orchDir: OrchDir, agentId: string): AgentLocation | undefined {
  return openLocationOf(orm(orchDir), agentId);
}

/** Every agent's open `agent_hosts` row, by agent id, in one read. */
export function agentLocations(orchDir: OrchDir): Map<string, AgentLocation> {
  const rows = orm(orchDir).select({ agentId: agentHosts.agentId, host: agentHosts.hostId, cwd: agentHosts.cwd, since: agentHosts.since })
    .from(agentHosts).where(isNull(agentHosts.until)).all();
  return new Map(rows.map(({ agentId, ...location }) => [agentId, location]));
}

/** Record a registered caller's own process. The process carries the host it runs on, and
 *  that must be the host the agent's open `agent_hosts` row names: the row stores no host of
 *  its own, so a process recorded under the wrong one would read as running where it does
 *  not. Session registration, which relocates the agent first, and {@link recordProcess}
 *  only: a caller is placed by its process (`placeProcess`), and this is how a session stays
 *  one agent across the processes it runs as. */
export function recordCallerProcessIn(db: Orm, agentId: AgentId, now: number, process: HostedProcess): void {
  const location = openLocationOf(db, agentId);
  if (location?.host !== process.host) {
    throw new Error(`process ${process.pid} runs on host ${process.host}, but ${agentId} runs on ${location?.host ?? "no host"}`);
  }
  const since = closeOpen(db, agentProcesses, agentId, now);
  db.insert(agentProcesses).values({ agentId, since, until: null, pid: process.pid, startToken: process.startToken }).run();
}

/** Record the process an agent this orchd runs runs as. */
export function recordProcess(orchDir: OrchDir, agent: HereAgent, now: number, values: ProcessInstance): void {
  withTransaction(orchDir, () => recordCallerProcessIn(orm(orchDir), agent.id, now, { host: agent.host, pid: values.pid, startToken: values.startToken }));
  refreshAgent(orchDir, agent.id);
}

export function endProcess(orchDir: OrchDir, agent: HereAgent, now: number): void {
  withTransaction(orchDir, () => {
    closeOpen(orm(orchDir), agentProcesses, agent.id, now);
  });
  refreshAgent(orchDir, agent.id);
}

/** The place an agent this orchd runs occupies in its plexer. A handle names a pane on this
 *  machine only, so only an agent here has one. */
export function setHandle(orchDir: OrchDir, agent: HereAgent, now: number, handle: string): void {
  withTransaction(orchDir, () => {
    const db = orm(orchDir);
    const since = closeOpen(db, agentHandles, agent.id, now);
    db.insert(agentHandles).values({ agentId: agent.id, since, until: null, handle }).run();
  });
  refreshAgent(orchDir, agent.id);
}

export function setSpace(orchDir: OrchDir, agentId: string, now: number, spaceId: string): void {
  withTransaction(orchDir, () => {
    const db = orm(orchDir);
    const since = closeOpen(db, agentSpaces, agentId, now);
    db.insert(agentSpaces).values({ agentId, since, until: null, spaceId }).run();
  });
  refreshAgent(orchDir, agentId);
}

export function clearSpace(orchDir: OrchDir, agentId: string, now: number): void {
  withTransaction(orchDir, () => {
    closeOpen(orm(orchDir), agentSpaces, agentId, now);
  });
  refreshAgent(orchDir, agentId);
}

export function setTuning(orchDir: OrchDir, agentId: string, now: number, values: TuningValues): void {
  withTransaction(orchDir, () => {
    const db = orm(orchDir);
    const since = closeOpen(db, agentTunings, agentId, now);
    db.insert(agentTunings).values({
      agentId, since, until: null, model: values.model, thinking: values.thinking ?? null,
    }).run();
  });
  refreshAgent(orchDir, agentId);
}

/** The form the agent's harness runs in. A restart in another form closes one row and opens
 *  the next, and the agent stays the same agent. */
export function setForm(orchDir: OrchDir, agentId: string, now: number, form: FormId): void {
  withTransaction(orchDir, () => {
    const db = orm(orchDir);
    const since = closeOpen(db, agentForms, agentId, now);
    db.insert(agentForms).values({ agentId, since, until: null, form }).run();
  });
  refreshAgent(orchDir, agentId);
}

/** The plexer holding an agent this orchd runs. An interval like every other environment
 *  fact: a move to another plexer closes one row and opens the next, and the agent stays the
 *  same agent. Stating the plexer it is already in changes nothing. A plexer runs on this
 *  machine, so only an agent here is in one. */
export function setAgentPlexer(orchDir: OrchDir, agent: HereAgent, now: number, plexerId: string): void {
  withTransaction(orchDir, () => {
    const db = orm(orchDir);
    const open = db.select({ plexerId: agentPlexers.plexerId }).from(agentPlexers)
      .where(and(eq(agentPlexers.agentId, agent.id), isNull(agentPlexers.until))).get();
    if (open?.plexerId === plexerId) return;
    const since = closeOpen(db, agentPlexers, agent.id, now);
    db.insert(agentPlexers).values({ agentId: agent.id, since, until: null, plexerId }).run();
  });
  refreshAgent(orchDir, agent.id);
}

/** Every open process row joined to its agent's open host row: a process runs where its agent
 *  runs. `agentId` narrows to one agent. */
function openProcesses(orchDir: OrchDir, agentId?: string): Map<string, StoredProcess> {
  const open = and(isNull(agentProcesses.until), agentId === undefined ? undefined : eq(agentProcesses.agentId, agentId));
  const rows = orm(orchDir)
    .select({ agentId: agentProcesses.agentId, host: agentHosts.hostId, pid: agentProcesses.pid, startToken: agentProcesses.startToken, since: agentProcesses.since })
    .from(agentProcesses)
    .innerJoin(agentHosts, and(eq(agentHosts.agentId, agentProcesses.agentId), isNull(agentHosts.until)))
    .where(open).all();
  return new Map(rows.map(({ agentId: id, ...process }) => [id, process]));
}

/** The process an agent this orchd runs runs as now. */
export function currentProcess(orchDir: OrchDir, agent: HereAgent): StoredProcess | undefined {
  return openProcesses(orchDir, agent.id).get(agent.id);
}

/** A registered caller's open process, wherever it runs, for the session registration path and
 *  the reads that place a caller by its process. Every other reader takes a
 *  {@link HereAgent} through {@link currentProcess}. */
export function callerProcess(orchDir: OrchDir, agentId: string): StoredProcess | undefined {
  return openProcesses(orchDir, agentId).get(agentId);
}

/** Every open process, by agent id, in one read: a fleet read, placed by its caller. */
export function currentProcesses(orchDir: OrchDir): Map<string, StoredProcess> {
  return openProcesses(orchDir);
}

export function currentHandle(orchDir: OrchDir, agentId: string): HandleRow | undefined {
  return orm(orchDir).select().from(agentHandles)
    .where(and(eq(agentHandles.agentId, agentId), isNull(agentHandles.until))).get();
}

export function currentSpace(orchDir: OrchDir, agentId: string): AgentSpaceRow | undefined {
  return orm(orchDir).select().from(agentSpaces)
    .where(and(eq(agentSpaces.agentId, agentId), isNull(agentSpaces.until))).get();
}

export function currentTuning(orchDir: OrchDir, agentId: string): TuningRow | undefined {
  return orm(orchDir).select().from(agentTunings)
    .where(and(eq(agentTunings.agentId, agentId), isNull(agentTunings.until))).get();
}

