import type { OrchDir } from "../types/core.ts";
import { asc, eq, isNull } from "drizzle-orm";
import { ormForRead, storeMemo } from "./connection.ts";
import { NO_TUNING } from "../policy/tuning.ts";
import type { AgentEnvironment, AgentHolder, AgentTuning, AgentView, EnvironmentAxisKey } from "../types/store.ts";
import {
  agentEndings,
  agentHandles,
  agentLeases,
  agentPlexers,
  agentSpaces,
  agentTunings,
  agentWorktrees,
  agents,
} from "../db/schema.ts";

/**
 * The one place the four facts are read back together.
 *
 * Identity, provenance, ownership and environment stay
 * separate tables so that changing one cannot rewrite another. That separation
 * is only worth having if nothing reassembles them into a second wide row: the
 * old `spawned` table was exactly that row, and moving an agent between plexers
 * meant minting a new primary key for it.
 *
 * Environment is a COMPOSITION, never a table. Each axis below has its own
 * narrow satellite with its own `since`/`until`; a missing axis is a missing
 * row, never a NULL column on the hub.
 *
 * Adding an axis (OS side, remote host, container) is one table plus one
 * entry in {@link ENVIRONMENT_AXES} — no consumer changes, because consumers
 * read {@link AgentView.environment} as a whole.
 *
 * Every reader here takes the WHOLE fleet in one query per table, joins in
 * memory, and keeps the result until the store changes. One agent is a lookup
 * in that fleet. Reading each agent on its own was ten queries per agent, and a
 * fleet listing ran thousands of them.
 */

/** The accumulator {@link composeEnvironment} fills: same keys, writable and not yet
 *  complete. Derived from the same union, so it can never list a different set. */
type ComposingEnvironment = Partial<Record<EnvironmentAxisKey, string | null>>;

/** One value per agent id. An agent with no row on the axis is absent from the map. */
type ByAgent<T> = ReadonlyMap<string, T>;

/**
 * One environment axis: the satellite it reads and how to pull every current
 * value at once. Adding an axis is one entry here.
 */
interface EnvironmentAxis {
  readonly key: string;
  readonly read: (orchDir: OrchDir) => ByAgent<string>;
}

function byAgent<T>(rows: readonly { agentId: string; value: T }[]): Map<string, T> {
  return new Map(rows.map((row) => [row.agentId, row.value]));
}

/** The open row of an interval satellite is the one with no `until`. */
function currentHandles(orchDir: OrchDir): ByAgent<string> {
  return byAgent(ormForRead(orchDir)?.select({ agentId: agentHandles.agentId, value: agentHandles.handle }).from(agentHandles)
    .where(isNull(agentHandles.until)).all() ?? []);
}

function currentSpaces(orchDir: OrchDir): ByAgent<string> {
  return byAgent(ormForRead(orchDir)?.select({ agentId: agentSpaces.agentId, value: agentSpaces.spaceId }).from(agentSpaces)
    .where(isNull(agentSpaces.until)).all() ?? []);
}

function currentPlexers(orchDir: OrchDir): ByAgent<string> {
  return byAgent(ormForRead(orchDir)?.select({ agentId: agentPlexers.agentId, value: agentPlexers.plexerId }).from(agentPlexers).all() ?? []);
}

function worktreePaths(orchDir: OrchDir): ByAgent<string> {
  return byAgent(ormForRead(orchDir)?.select({ agentId: agentWorktrees.agentId, value: agentWorktrees.path }).from(agentWorktrees).all() ?? []);
}

function worktreeBranches(orchDir: OrchDir): ByAgent<string> {
  return byAgent(ormForRead(orchDir)?.select({ agentId: agentWorktrees.agentId, value: agentWorktrees.branch }).from(agentWorktrees).all() ?? []);
}

// `as const` pins the keys so the shape can be read off this list; `satisfies`
// checks each entry without widening it. This array is the ONE place the set of
// axes is written down — that is what makes adding one a single line.
export const ENVIRONMENT_AXES = [
  { key: "plexer", read: currentPlexers },
  { key: "handle", read: currentHandles },
  { key: "space", read: currentSpaces },
  { key: "worktree", read: worktreePaths },
  { key: "branch", read: worktreeBranches },
] as const satisfies readonly EnvironmentAxis[];

/** Every axis, read once: the axis key to its per-agent values. */
type AxisValues = ReadonlyMap<EnvironmentAxisKey, ByAgent<string>>;

function readAxes(orchDir: OrchDir): AxisValues {
  return new Map(ENVIRONMENT_AXES.map((axis) => [axis.key, axis.read(orchDir)]));
}

/** Every axis produced a value, so the partial is the whole environment. The
 *  check is real: it asks the axis list itself, which is the same list the type
 *  is derived from, so it cannot drift from what `AgentEnvironment` requires. */
function isComplete(composed: ComposingEnvironment): composed is AgentEnvironment {
  return ENVIRONMENT_AXES.every((axis) => axis.key in composed);
}

function composeEnvironment(agentId: string, axes: AxisValues): AgentEnvironment {
  const composed: ComposingEnvironment = {};
  for (const axis of ENVIRONMENT_AXES) composed[axis.key] = axes.get(axis.key)?.get(agentId) ?? null;
  if (!isComplete(composed)) throw new Error("orch: an environment axis produced no value");
  return composed;
}

export function environmentOf(orchDir: OrchDir, agentId: string): AgentEnvironment {
  return composeEnvironment(agentId, readFleetFacts(orchDir).axes);
}

function currentTunings(orchDir: OrchDir): ByAgent<AgentTuning> {
  const rows = ormForRead(orchDir)?.select({ agentId: agentTunings.agentId, model: agentTunings.model, thinking: agentTunings.thinking })
    .from(agentTunings).where(isNull(agentTunings.until)).all() ?? [];
  return new Map(rows.map((row) => [row.agentId, { model: row.model, thinking: row.thinking }]));
}

export function tuningOf(orchDir: OrchDir, agentId: string): AgentTuning {
  return readFleetFacts(orchDir).tunings.get(agentId) ?? NO_TUNING;
}

/** The live lease, if one is open. A closed lease is history, not ownership. */
function currentHolders(orchDir: OrchDir): ByAgent<AgentHolder> {
  const rows = ormForRead(orchDir)?.select({ agentId: agentLeases.agentId, orchId: agentLeases.orchId, since: agentLeases.since })
    .from(agentLeases).where(isNull(agentLeases.until)).all() ?? [];
  return new Map(rows.map((row) => [row.agentId, { orchId: row.orchId, since: row.since }]));
}

export function holderOf(orchDir: OrchDir, agentId: string): AgentHolder | null {
  return readFleetFacts(orchDir).holders.get(agentId) ?? null;
}

function endings(orchDir: OrchDir): ByAgent<number> {
  return byAgent(ormForRead(orchDir)?.select({ agentId: agentEndings.agentId, value: agentEndings.endedAt }).from(agentEndings).all() ?? []);
}

type HubRow = typeof agents.$inferSelect;

/** Every hub, oldest first — the ordering the old `spawned` scan produced. */
function hubs(orchDir: OrchDir): HubRow[] {
  return ormForRead(orchDir)?.select().from(agents).orderBy(asc(agents.createdAt), asc(agents.id)).all() ?? [];
}

/** The spawners' names TODAY, not the names they had when they spawned. A whole-fleet
 *  read already holds every spawner; a one-agent read fetches the one it lacks. */
function spawnerNames(orchDir: OrchDir, rows: readonly HubRow[]): ByAgent<string> {
  const names = new Map(rows.map((row) => [row.id, row.name]));
  for (const row of rows) {
    if (row.spawnedBy === null || names.has(row.spawnedBy)) continue;
    const spawner = ormForRead(orchDir)?.select({ name: agents.name }).from(agents).where(eq(agents.id, row.spawnedBy)).get();
    if (spawner) names.set(row.spawnedBy, spawner.name);
  }
  return names;
}

/** The satellites of the fleet, each table read once. */
interface FleetFacts {
  readonly hubs: readonly HubRow[];
  readonly names: ByAgent<string>;
  readonly holders: ByAgent<AgentHolder>;
  readonly axes: AxisValues;
  readonly tunings: ByAgent<AgentTuning>;
  readonly endings: ByAgent<number>;
  readonly views: ReadonlyMap<string, AgentView>;
}

/** The fleet, read once per store version. Every reader below is a lookup in it. */
const readFleetFacts = storeMemo((orchDir: OrchDir): FleetFacts => {
  const rows = hubs(orchDir);
  const facts = {
    hubs: rows,
    names: spawnerNames(orchDir, rows),
    holders: currentHolders(orchDir),
    axes: readAxes(orchDir),
    tunings: currentTunings(orchDir),
    endings: endings(orchDir),
  };
  return { ...facts, views: new Map(rows.map((hub) => [hub.id, composeView(hub, facts)])) };
});

function composeView(hub: HubRow, facts: Omit<FleetFacts, "views">): AgentView {
  return {
    id: hub.id,
    name: hub.name,
    label: hub.label,
    harnessId: hub.harnessId,
    cwd: hub.cwd,
    createdAt: hub.createdAt,
    spawnedBy: hub.spawnedBy,
    spawnedByName: hub.spawnedBy === null ? null : facts.names.get(hub.spawnedBy) ?? null,
    rootAgentId: hub.rootAgentId,
    heldBy: facts.holders.get(hub.id) ?? null,
    environment: composeEnvironment(hub.id, facts.axes),
    tuning: facts.tunings.get(hub.id) ?? NO_TUNING,
    endedAt: facts.endings.get(hub.id) ?? null,
  };
}

export function agentView(orchDir: OrchDir, agentId: string): AgentView | null {
  return readFleetFacts(orchDir).views.get(agentId) ?? null;
}

/** Every agent, oldest first, in one read per table. */
export function agentViews(orchDir: OrchDir): AgentView[] {
  return [...readFleetFacts(orchDir).views.values()];
}

/** Every agent the store knows, indexed by its minted id. An absent store is an empty fleet. */
export function agentViewIndex(orchDir: OrchDir): ReadonlyMap<string, AgentView> {
  try {
    return readFleetFacts(orchDir).views;
  } catch {
    // Nothing spawned yet.
    return new Map();
  }
}

/** Agents that have not ended. Liveness of the PROCESS is a separate question
 *  answered by presence; this is the store's own record of what was closed. */
export function liveAgentViews(orchDir: OrchDir): AgentView[] {
  return agentViews(orchDir).filter((view) => view.endedAt === null);
}

/** {@link liveAgentViews} over an index already in hand, so a caller that holds
 *  the fleet does not read it again to drop the ended agents. */
export function liveViews(index: ReadonlyMap<string, AgentView>): Map<string, AgentView> {
  const live = new Map<string, AgentView>();
  for (const [id, view] of index) if (view.endedAt === null) live.set(id, view);
  return live;
}
