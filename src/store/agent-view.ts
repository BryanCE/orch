import { and, asc, eq, isNull } from "drizzle-orm";
import { orm } from "./connection.ts";
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
 * TASKS/02-scope.md A1 keeps identity, provenance, ownership and environment in
 * separate tables so that changing one cannot rewrite another. That separation
 * is only worth having if nothing reassembles them into a second wide row: the
 * old `spawned` table was exactly that row, and moving an agent between plexers
 * meant minting a new primary key for it.
 *
 * A14: environment is a COMPOSITION, never a table. Each axis below has its own
 * narrow satellite with its own `since`/`until`; a missing axis is a missing
 * row, never a NULL column on the hub.
 *
 * A15: adding an axis (OS side, remote host, container) is one table plus one
 * entry in {@link ENVIRONMENT_AXES} — no consumer changes, because consumers
 * read {@link AgentView.environment} as a whole.
 */

/** Where an agent is — DERIVED from {@link ENVIRONMENT_AXES}, never written out
 *  a second time. Every field is nullable because an axis that has no row is
 *  genuinely absent: a headless agent has no handle, and that is an answer, not
 *  a missing value to paper over. */
export type AgentEnvironment = Readonly<Record<EnvironmentAxisKey, string | null>>;

type EnvironmentAxisKey = typeof ENVIRONMENT_AXES[number]["key"];

/** The accumulator {@link environmentOf} fills: same keys, writable and not yet
 *  complete. Derived from the same union, so it can never list a different set. */
type ComposingEnvironment = Partial<Record<EnvironmentAxisKey, string | null>>;

/** How an agent is configured. Not environment: it survives a move. */
export interface AgentTuning {
  readonly model: string | null;
  readonly thinking: string | null;
}

/** Who holds an agent right now, and since when. `null` is unheld — and an
 *  unheld agent is not a dead one (Rule 11: work survives its spawner). */
export interface AgentHolder {
  readonly orchId: string;
  readonly since: number;
}

/** The four facts, side by side but never merged. */
export interface AgentView {
  /** Identity — minted once, immutable. */
  readonly id: string;
  readonly name: string;
  readonly label: string | null;
  readonly harnessId: string;
  readonly cwd: string;
  readonly createdAt: number;
  /** Provenance — who spawned it, immutable. */
  readonly spawnedBy: string | null;
  /** The spawner's CURRENT name, read as a join. Never stored beside the child:
   *  a copy goes stale the moment the spawner is renamed, and a name is mutable
   *  by design while provenance is not. `null` when nothing spawned this agent. */
  readonly spawnedByName: string | null;
  readonly rootAgentId: string;
  /** Ownership — a lease, mutable, and never authorization. */
  readonly heldBy: AgentHolder | null;
  /** Environment — where it is, mutable. */
  readonly environment: AgentEnvironment;
  readonly tuning: AgentTuning;
  /** When it ended. An ending is an instant, never a lifetime column (A1). */
  readonly endedAt: number | null;
}

/**
 * One environment axis: the satellite it reads and how to pull its current
 * value. Adding an axis is one entry here — that is the whole of A15.
 */
interface EnvironmentAxis {
  readonly key: string;
  readonly read: (orchDir: string, agentId: string) => string | null;
}

/** The open row of an interval satellite is the one with no `until`. */
function currentHandle(orchDir: string, agentId: string): string | null {
  const row = orm(orchDir).select({ handle: agentHandles.handle }).from(agentHandles)
    .where(and(eq(agentHandles.agentId, agentId), isNull(agentHandles.until))).get();
  return row?.handle ?? null;
}

function currentSpace(orchDir: string, agentId: string): string | null {
  const row = orm(orchDir).select({ spaceId: agentSpaces.spaceId }).from(agentSpaces)
    .where(and(eq(agentSpaces.agentId, agentId), isNull(agentSpaces.until))).get();
  return row?.spaceId ?? null;
}

function currentPlexer(orchDir: string, agentId: string): string | null {
  const row = orm(orchDir).select({ plexerId: agentPlexers.plexerId }).from(agentPlexers)
    .where(eq(agentPlexers.agentId, agentId)).get();
  return row?.plexerId ?? null;
}

function worktreePath(orchDir: string, agentId: string): string | null {
  const row = orm(orchDir).select({ path: agentWorktrees.path }).from(agentWorktrees)
    .where(eq(agentWorktrees.agentId, agentId)).get();
  return row?.path ?? null;
}

function worktreeBranch(orchDir: string, agentId: string): string | null {
  const row = orm(orchDir).select({ branch: agentWorktrees.branch }).from(agentWorktrees)
    .where(eq(agentWorktrees.agentId, agentId)).get();
  return row?.branch ?? null;
}

// `as const` pins the keys so the shape can be read off this list; `satisfies`
// checks each entry without widening it. This array is the ONE place the set of
// axes is written down — that is what makes adding one a single line (A15).
export const ENVIRONMENT_AXES = [
  { key: "plexer", read: currentPlexer },
  { key: "handle", read: currentHandle },
  { key: "space", read: currentSpace },
  { key: "worktree", read: worktreePath },
  { key: "branch", read: worktreeBranch },
] as const satisfies readonly EnvironmentAxis[];

/** Every axis produced a value, so the partial is the whole environment. The
 *  check is real: it asks the axis list itself, which is the same list the type
 *  is derived from, so it cannot drift from what `AgentEnvironment` requires. */
function isComplete(composed: ComposingEnvironment): composed is AgentEnvironment {
  return ENVIRONMENT_AXES.every((axis) => axis.key in composed);
}

export function environmentOf(orchDir: string, agentId: string): AgentEnvironment {
  const composed: ComposingEnvironment = {};
  for (const axis of ENVIRONMENT_AXES) composed[axis.key] = axis.read(orchDir, agentId);
  if (!isComplete(composed)) throw new Error("orch: an environment axis produced no value");
  return composed;
}

export function tuningOf(orchDir: string, agentId: string): AgentTuning {
  const row = orm(orchDir).select({ model: agentTunings.model, thinking: agentTunings.thinking })
    .from(agentTunings).where(and(eq(agentTunings.agentId, agentId), isNull(agentTunings.until))).get();
  return { model: row?.model ?? null, thinking: row?.thinking ?? null };
}

/** The live lease, if one is open. A closed lease is history, not ownership. */
export function holderOf(orchDir: string, agentId: string): AgentHolder | null {
  const row = orm(orchDir).select({ orchId: agentLeases.orchId, since: agentLeases.since })
    .from(agentLeases).where(and(eq(agentLeases.agentId, agentId), isNull(agentLeases.until))).get();
  return row ? { orchId: row.orchId, since: row.since } : null;
}

/** The spawner's name today, not the name it had when it spawned this agent. */
function nameOf(orchDir: string, agentId: string | null): string | null {
  if (agentId === null) return null;
  const row = orm(orchDir).select({ name: agents.name }).from(agents).where(eq(agents.id, agentId)).get();
  return row?.name ?? null;
}

function endedAt(orchDir: string, agentId: string): number | null {
  const row = orm(orchDir).select({ endedAt: agentEndings.endedAt }).from(agentEndings)
    .where(eq(agentEndings.agentId, agentId)).get();
  return row?.endedAt ?? null;
}

export function agentView(orchDir: string, agentId: string): AgentView | null {
  const hub = orm(orchDir).select().from(agents).where(eq(agents.id, agentId)).get();
  if (!hub) return null;
  return {
    id: hub.id,
    name: hub.name,
    label: hub.label,
    harnessId: hub.harnessId,
    cwd: hub.cwd,
    createdAt: hub.createdAt,
    spawnedBy: hub.spawnedBy,
    spawnedByName: nameOf(orchDir, hub.spawnedBy),
    rootAgentId: hub.rootAgentId,
    heldBy: holderOf(orchDir, agentId),
    environment: environmentOf(orchDir, agentId),
    tuning: tuningOf(orchDir, agentId),
    endedAt: endedAt(orchDir, agentId),
  };
}

/** Every agent, oldest first — the ordering the old `spawned` scan produced. */
export function agentViews(orchDir: string): AgentView[] {
  const ids = orm(orchDir).select({ id: agents.id }).from(agents).orderBy(asc(agents.createdAt), asc(agents.id)).all();
  const views: AgentView[] = [];
  for (const { id } of ids) {
    const view = agentView(orchDir, id);
    if (view) views.push(view);
  }
  return views;
}

/** Agents that have not ended. Liveness of the PROCESS is a separate question
 *  answered by presence; this is the store's own record of what was closed. */
export function liveAgentViews(orchDir: string): AgentView[] {
  return agentViews(orchDir).filter((view) => view.endedAt === null);
}
