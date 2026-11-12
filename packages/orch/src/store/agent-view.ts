import type { OrchDir } from "../types/core.ts";
import type { HereAgent } from "../types/agent-place.ts";
import { and, asc, eq, isNull } from "drizzle-orm";
import { ormForRead, registerMemoReset } from "./connection.ts";
import { NO_TUNING } from "../policy/tuning.ts";
import type { AgentEnvironment, AgentHolder, AgentLocationAxes, AgentTuning, AgentView, EnvironmentAxisKey } from "../types/store.ts";
import { isHostOs } from "../host.ts";
import { isFormId, type FormId } from "../types/form.ts";
import {
  agentEndings,
  agentForms,
  agentHandles,
  agentHosts,
  agentLeases,
  agentPlexers,
  agentSpaces,
  agentTunings,
  agentWorktrees,
  agents,
  hosts,
} from "../db/schema.ts";

/**
 * The one place the four facts are read back together.
 *
 * Identity, provenance, ownership and environment stay separate tables so that
 * changing one cannot rewrite another. Nothing reassembles them into a second
 * wide row; the old `spawned` table was exactly that row.
 *
 * Environment is a COMPOSITION, never a table. Each axis has its own narrow
 * satellite with its own `since`/`until`; a missing axis is a missing row.
 * Adding an axis is one table plus one entry in {@link ENVIRONMENT_AXES}.
 * The host and directory are the one exception to "missing": every agent has an
 * open `agent_hosts` row, so they are read beside the axes and never null.
 *
 * The fleet is loaded from the store once per process, one query per table,
 * and held. A read is a lookup. A writer that changes an agent calls
 * {@link refreshAgent}, which re-reads that one agent and recomposes its view.
 */

/** The accumulator {@link composeEnvironment} fills: same keys, writable and not yet
 *  complete. Derived from the same union, so it can never list a different set. */
type ComposingEnvironment = Partial<Record<EnvironmentAxisKey, string | null>>;

/** One value per agent id. An agent with no row on the axis is absent from the map. */
type ByAgent<T> = ReadonlyMap<string, T>;
type AgentRefreshListener = (orchDir: OrchDir, agentId: string) => void;
const refreshListeners = new Set<AgentRefreshListener>();

export function onAgentRefreshed(listener: AgentRefreshListener): void {
  refreshListeners.add(listener);
}

/** One environment axis: the satellite it reads, for the whole fleet or for one agent. */
interface EnvironmentAxis {
  readonly key: string;
  readonly read: (orchDir: OrchDir) => ByAgent<string>;
  readonly readOne: (orchDir: OrchDir, agentId: string) => string | null;
}

function byAgent<T>(rows: readonly { agentId: string; value: T }[]): Map<string, T> {
  return new Map(rows.map((row) => [row.agentId, row.value]));
}

function currentHandles(orchDir: OrchDir): ByAgent<string> {
  return byAgent(ormForRead(orchDir)?.select({ agentId: agentHandles.agentId, value: agentHandles.handle }).from(agentHandles)
    .where(isNull(agentHandles.until)).all() ?? []);
}

function currentHandle(orchDir: OrchDir, agentId: string): string | null {
  return ormForRead(orchDir)?.select({ value: agentHandles.handle }).from(agentHandles)
    .where(and(eq(agentHandles.agentId, agentId), isNull(agentHandles.until))).get()?.value ?? null;
}

function currentSpaces(orchDir: OrchDir): ByAgent<string> {
  return byAgent(ormForRead(orchDir)?.select({ agentId: agentSpaces.agentId, value: agentSpaces.spaceId }).from(agentSpaces)
    .where(isNull(agentSpaces.until)).all() ?? []);
}

function currentSpace(orchDir: OrchDir, agentId: string): string | null {
  return ormForRead(orchDir)?.select({ value: agentSpaces.spaceId }).from(agentSpaces)
    .where(and(eq(agentSpaces.agentId, agentId), isNull(agentSpaces.until))).get()?.value ?? null;
}

function currentPlexers(orchDir: OrchDir): ByAgent<string> {
  return byAgent(ormForRead(orchDir)?.select({ agentId: agentPlexers.agentId, value: agentPlexers.plexerId }).from(agentPlexers)
    .where(isNull(agentPlexers.until)).all() ?? []);
}

function currentPlexer(orchDir: OrchDir, agentId: string): string | null {
  return ormForRead(orchDir)?.select({ value: agentPlexers.plexerId }).from(agentPlexers)
    .where(and(eq(agentPlexers.agentId, agentId), isNull(agentPlexers.until))).get()?.value ?? null;
}

type WorktreeColumn = "path" | "branch" | "base" | "provider";

/** One fact of the agent's worktree as an environment axis. No row means no worktree. */
function worktreeAxis<const Key extends string>(key: Key, column: WorktreeColumn) {
  return {
    key,
    read: (orchDir: OrchDir): ByAgent<string> =>
      byAgent(ormForRead(orchDir)?.select({ agentId: agentWorktrees.agentId, value: agentWorktrees[column] }).from(agentWorktrees).all() ?? []),
    readOne: (orchDir: OrchDir, agentId: string): string | null =>
      ormForRead(orchDir)?.select({ value: agentWorktrees[column] }).from(agentWorktrees).where(eq(agentWorktrees.agentId, agentId)).get()?.value ?? null,
  };
}

export const ENVIRONMENT_AXES = [
  { key: "plexer", read: currentPlexers, readOne: currentPlexer },
  { key: "handle", read: currentHandles, readOne: currentHandle },
  { key: "space", read: currentSpaces, readOne: currentSpace },
  worktreeAxis("worktree", "path"),
  worktreeAxis("branch", "branch"),
  worktreeAxis("worktreeBase", "base"),
  worktreeAxis("worktreeProvider", "provider"),
] as const satisfies readonly EnvironmentAxis[];

type AxisValues = Map<EnvironmentAxisKey, Map<string, string>>;

function readAxes(orchDir: OrchDir): AxisValues {
  const axes: AxisValues = new Map();
  for (const axis of ENVIRONMENT_AXES) axes.set(axis.key, new Map(axis.read(orchDir)));
  return axes;
}

type AxisEnvironment = Readonly<Record<EnvironmentAxisKey, string | null>>;

function isComplete(composed: ComposingEnvironment): composed is AxisEnvironment {
  return ENVIRONMENT_AXES.every((axis) => axis.key in composed);
}

function composeEnvironment(agentId: string, axes: AxisValues, locations: ReadonlyMap<string, AgentLocationAxes>): AgentEnvironment {
  const composed: ComposingEnvironment = {};
  for (const axis of ENVIRONMENT_AXES) composed[axis.key] = axes.get(axis.key)?.get(agentId) ?? null;
  if (!isComplete(composed)) throw new Error("orch: an environment axis produced no value");
  const location = locations.get(agentId);
  if (location === undefined) throw new Error(`orch: agent ${agentId} has no open host row: the store is corrupt. Reap the agent or rebuild the store.`);
  return { ...composed, ...location };
}

/** Every agent's open `agent_hosts` row with its host's identity; `agentId` narrows to one. */
function readLocations(orchDir: OrchDir, agentId?: string): Map<string, AgentLocationAxes> {
  const open = and(isNull(agentHosts.until), agentId === undefined ? undefined : eq(agentHosts.agentId, agentId));
  const rows = ormForRead(orchDir)?.select({ agentId: agentHosts.agentId, cwd: agentHosts.cwd, id: hosts.id, name: hosts.name, os: hosts.os })
    .from(agentHosts).innerJoin(hosts, eq(hosts.id, agentHosts.hostId)).where(open).all() ?? [];
  return new Map(rows.map((row) => {
    if (!isHostOs(row.os)) throw new Error(`host ${row.id} has an unknown os ${row.os}`);
    return [row.agentId, { host: { id: row.id, name: row.name, os: row.os }, cwd: row.cwd }];
  }));
}

function currentTunings(orchDir: OrchDir): ByAgent<AgentTuning> {
  const rows = ormForRead(orchDir)?.select({ agentId: agentTunings.agentId, model: agentTunings.model, thinking: agentTunings.thinking })
    .from(agentTunings).where(isNull(agentTunings.until)).all() ?? [];
  return new Map(rows.map((row) => [row.agentId, { model: row.model, thinking: row.thinking }]));
}

function currentForms(orchDir: OrchDir): ByAgent<FormId> {
  const rows = ormForRead(orchDir)?.select({ agentId: agentForms.agentId, form: agentForms.form })
    .from(agentForms).where(isNull(agentForms.until)).all() ?? [];
  const forms = new Map<string, FormId>();
  for (const row of rows) if (isFormId(row.form)) forms.set(row.agentId, row.form);
  return forms;
}

function currentHolders(orchDir: OrchDir): ByAgent<AgentHolder> {
  const rows = ormForRead(orchDir)?.select({ agentId: agentLeases.agentId, orchId: agentLeases.orchId, since: agentLeases.since })
    .from(agentLeases).where(isNull(agentLeases.until)).all() ?? [];
  return new Map(rows.map((row) => [row.agentId, { orchId: row.orchId, since: row.since }]));
}

function endings(orchDir: OrchDir): ByAgent<number> {
  return byAgent(ormForRead(orchDir)?.select({ agentId: agentEndings.agentId, value: agentEndings.endedAt }).from(agentEndings).all() ?? []);
}

type HubRow = typeof agents.$inferSelect;

function hubs(orchDir: OrchDir): HubRow[] {
  return ormForRead(orchDir)?.select().from(agents).orderBy(asc(agents.createdAt), asc(agents.id)).all() ?? [];
}

function spawnerNames(orchDir: OrchDir, rows: readonly HubRow[]): ByAgent<string> {
  const names = new Map(rows.map((row) => [row.id, row.name]));
  for (const row of rows) {
    if (row.spawnedBy === null || names.has(row.spawnedBy)) continue;
    const spawner = ormForRead(orchDir)?.select({ name: agents.name }).from(agents).where(eq(agents.id, row.spawnedBy)).get();
    if (spawner) names.set(row.spawnedBy, spawner.name);
  }
  return names;
}

interface FleetFacts {
  hubs: Map<string, HubRow>;
  names: Map<string, string>;
  holders: Map<string, AgentHolder>;
  axes: AxisValues;
  locations: Map<string, AgentLocationAxes>;
  tunings: Map<string, AgentTuning>;
  forms: Map<string, FormId>;
  endings: Map<string, number>;
  views: Map<string, AgentView>;
}

const fleets = new Map<OrchDir, FleetFacts>();
registerMemoReset(() => fleets.clear());

function heldFleet(orchDir: OrchDir): FleetFacts {
  const held = fleets.get(orchDir);
  if (held) return held;
  const rows = hubs(orchDir);
  const facts: FleetFacts = {
    hubs: new Map(rows.map((hub) => [hub.id, hub])),
    names: new Map(spawnerNames(orchDir, rows)),
    holders: new Map(currentHolders(orchDir)),
    axes: readAxes(orchDir),
    locations: readLocations(orchDir),
    tunings: new Map(currentTunings(orchDir)),
    forms: new Map(currentForms(orchDir)),
    endings: new Map(endings(orchDir)),
    views: new Map(),
  };
  for (const hub of rows) facts.views.set(hub.id, composeView(hub, facts));
  fleets.set(orchDir, facts);
  return facts;
}

function composeView(hub: HubRow, facts: FleetFacts): AgentView {
  return {
    id: hub.id,
    name: hub.name,
    label: hub.label,
    harnessId: hub.harnessId,
    createdAt: hub.createdAt,
    kind: hub.kind,
    spawnedBy: hub.spawnedBy,
    spawnedByName: hub.spawnedBy === null ? null : facts.names.get(hub.spawnedBy) ?? null,
    rootAgentId: hub.rootAgentId,
    heldBy: facts.holders.get(hub.id) ?? null,
    environment: composeEnvironment(hub.id, facts.axes, facts.locations),
    tuning: facts.tunings.get(hub.id) ?? NO_TUNING,
    form: facts.forms.get(hub.id) ?? null,
    endedAt: facts.endings.get(hub.id) ?? null,
  };
}

export function environmentOf(orchDir: OrchDir, agentId: string): AgentEnvironment {
  const facts = heldFleet(orchDir);
  return composeEnvironment(agentId, facts.axes, facts.locations);
}

/** An agent's pane on this machine: its plexer and that plexer's native handle. */
export interface AgentPane {
  readonly plexer: string | null;
  readonly handle: string | null;
}

/** The pane an agent this orchd runs sits in: its plexer and that plexer's native handle.
 *  Both name a pane on this machine, so only an agent proven here has one to act on. */
export function paneOf(orchDir: OrchDir, agent: HereAgent): AgentPane {
  const { plexer, handle } = environmentOf(orchDir, agent.id);
  return { plexer, handle };
}

export function holderOf(orchDir: OrchDir, agentId: string): AgentHolder | null {
  return heldFleet(orchDir).holders.get(agentId) ?? null;
}

function refreshHub(orchDir: OrchDir, facts: FleetFacts, agentId: string): HubRow | null {
  const hub = ormForRead(orchDir)?.select().from(agents).where(eq(agents.id, agentId)).get();
  if (!hub) {
    dropAgent(facts, agentId);
    return null;
  }
  facts.hubs.set(agentId, hub);
  facts.names.set(agentId, hub.name);
  if (hub.spawnedBy !== null && !facts.names.has(hub.spawnedBy)) {
    const spawner = ormForRead(orchDir)?.select({ name: agents.name }).from(agents).where(eq(agents.id, hub.spawnedBy)).get();
    if (spawner) facts.names.set(hub.spawnedBy, spawner.name);
  }
  refreshSatellites(orchDir, facts, agentId);
  facts.views.set(agentId, composeView(hub, facts));
  return hub;
}

function refreshSatellites(orchDir: OrchDir, facts: FleetFacts, agentId: string): void {
  const holder = ormForRead(orchDir)?.select({ orchId: agentLeases.orchId, since: agentLeases.since }).from(agentLeases)
    .where(and(eq(agentLeases.agentId, agentId), isNull(agentLeases.until))).get();
  if (holder) facts.holders.set(agentId, holder);
  else facts.holders.delete(agentId);
  const location = readLocations(orchDir, agentId).get(agentId);
  if (location) facts.locations.set(agentId, location);
  else facts.locations.delete(agentId);
  for (const axis of ENVIRONMENT_AXES) {
    const value = axis.readOne(orchDir, agentId);
    const values = facts.axes.get(axis.key);
    if (value === null) values?.delete(agentId);
    else values?.set(agentId, value);
  }
  const tuning = ormForRead(orchDir)?.select({ model: agentTunings.model, thinking: agentTunings.thinking }).from(agentTunings)
    .where(and(eq(agentTunings.agentId, agentId), isNull(agentTunings.until))).get();
  if (tuning) facts.tunings.set(agentId, tuning);
  else facts.tunings.delete(agentId);
  const form = ormForRead(orchDir)?.select({ form: agentForms.form }).from(agentForms)
    .where(and(eq(agentForms.agentId, agentId), isNull(agentForms.until))).get();
  if (form && isFormId(form.form)) facts.forms.set(agentId, form.form);
  else facts.forms.delete(agentId);
  const ending = ormForRead(orchDir)?.select({ endedAt: agentEndings.endedAt }).from(agentEndings)
    .where(eq(agentEndings.agentId, agentId)).get();
  if (ending) facts.endings.set(agentId, ending.endedAt);
  else facts.endings.delete(agentId);
}

function recomposeChildren(facts: FleetFacts, agentId: string): void {
  for (const child of facts.hubs.values()) {
    if (child.spawnedBy === agentId) facts.views.set(child.id, composeView(child, facts));
  }
}

function dropAgent(facts: FleetFacts, agentId: string): void {
  facts.hubs.delete(agentId);
  facts.names.delete(agentId);
  facts.holders.delete(agentId);
  facts.tunings.delete(agentId);
  facts.forms.delete(agentId);
  facts.endings.delete(agentId);
  facts.locations.delete(agentId);
  for (const values of facts.axes.values()) values.delete(agentId);
  facts.views.delete(agentId);
  recomposeChildren(facts, agentId);
}

export function refreshAgent(orchDir: OrchDir, agentId: string): void {
  const facts = fleets.get(orchDir);
  if (facts) {
    const hub = refreshHub(orchDir, facts, agentId);
    if (hub) recomposeChildren(facts, agentId);
  }
  for (const listener of refreshListeners) listener(orchDir, agentId);
}

export function agentView(orchDir: OrchDir, agentId: string): AgentView | null {
  return heldFleet(orchDir).views.get(agentId) ?? null;
}

export function agentViews(orchDir: OrchDir): AgentView[] {
  return [...heldFleet(orchDir).views.values()];
}

export function agentViewIndex(orchDir: OrchDir): ReadonlyMap<string, AgentView> {
  return heldFleet(orchDir).views;
}

export function liveAgentViews(orchDir: OrchDir): AgentView[] {
  return agentViews(orchDir).filter((view) => view.endedAt === null);
}

export function liveViews(index: ReadonlyMap<string, AgentView>): Map<string, AgentView> {
  const live = new Map<string, AgentView>();
  for (const [id, view] of index) if (view.endedAt === null) live.set(id, view);
  return live;
}
