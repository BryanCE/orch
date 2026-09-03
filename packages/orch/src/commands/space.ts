import { mintAgentId } from "../backends/identity.ts";
import { resolveBackend } from "../backends/registry.ts";
import { loadSettings } from "../settings/read.ts";
import { selfId } from "../identity/self.ts";
import { orchDir } from "../presence/writer.ts";
import { and, asc, eq, isNull } from "drizzle-orm";
import { orm } from "../store/connection.ts";
import { agentSpaces, agents, spaces } from "../db/schema.ts";
import { clearHome, homeHandle, homeLabel, openHome } from "../store/home-rows.ts";
import { die, splitOptionFlags } from "./target.ts";
import { errorMessage } from "../util.ts";
import type { SpaceEnvironment } from "../types/command.ts";

/**
 * `orch space` — orch's OWN grouping of work.
 *
 * A space is user-created, optional and identified by a name orch owns. It is
 * NOT a plexer's workspace: creating, renaming, listing and deleting one are
 * orch's own writes and work in every environment, including one with no screen.
 *
 * A plexer may additionally HOLD that space — a home.
 * That is an environment role, composed only by a plexer that implements it
 * completely; `spaceHome === null` IS the absence (E13), never a probe. The
 * coordinate it hands back lands in `space_plexers` and is never displayed
 * (E10) — printing one is how `wF` came to be shown as a name a human chose.
 *
 * Only `focus` genuinely needs the home, so only `focus` can be answered with an
 * absence, and that answer names the space and the verb (E14) and exits zero.
 */

interface SpaceRecord {
  readonly id: string;
  readonly name: string;
}

interface BoundaryAnswer {
  readonly outcome: "answer";
  readonly text: string;
  readonly reason: "no-pane" | "no-environment-role";
}

function readSpaceRows(directory: string): SpaceRecord[] {
  return orm(directory).select({ id: spaces.id, name: spaces.name }).from(spaces)
    .orderBy(asc(spaces.name), asc(spaces.id)).all().flatMap((value): SpaceRecord[] => {
    return [{ id: value.id, name: value.name }];
  });
}

/** This environment's live home coordinate for a space, or null when the space
 *  has none HERE — a home recorded in another plexer is not this one's to drive.
 *  The read lives in `src/store/home-rows.ts` with every other home row so a
 *  space and a pack cannot drift into two shapes (E10, E11). */
function readHome(env: SpaceEnvironment, spaceId: string): string | null {
  return homeHandle(env.directory, { kind: "space", id: spaceId }, env.plexerId);
}

function findSpace(directory: string, target: string): SpaceRecord {
  const matches = readSpaceRows(directory).filter((space) => space.id === target || space.name === target);
  if (matches.length === 1) return matches[0]!;
  if (matches.length > 1) throw new Error(`Ambiguous space "${target}": ${matches.map((space) => space.id).join(", ")}.`);
  throw new Error(`No space named or identified "${target}".`);
}

function emit(value: unknown, text: string, json: boolean): void {
  process.stdout.write(json ? JSON.stringify(value) + "\n" : text + "\n");
}

/** An absence is an answer to whoever asked, never a failure (E14). */
function answer(space: SpaceRecord, verb: string, json: boolean): void {
  const plan: BoundaryAnswer = {
    outcome: "answer",
    reason: "no-environment-role",
    text: `${space.name} has no home in this environment; ${verb} does not apply.`,
  };
  emit(plan, plan.text, json);
}

/** The actor id, but only when orch's own store still holds that agent — a
 *  `created_by` naming a reaped row would fail the foreign key on a write that
 *  the reference grants nothing to. */
function recordableActor(env: SpaceEnvironment): string | null {
  if (env.actorId === null) return null;
  const row = orm(env.directory).select({ id: agents.id }).from(agents).where(eq(agents.id, env.actorId)).get();
  return row ? env.actorId : null;
}

function listSpaces(env: SpaceEnvironment, json: boolean): void {
  const spaces = readSpaceRows(env.directory).map((space) => ({ ...space, home: readHome(env, space.id) !== null }));
  if (json) {
    process.stdout.write(JSON.stringify({ spaces }, null, 2) + "\n");
    return;
  }
  if (spaces.length === 0) process.stdout.write("No spaces.\n");
  else for (const space of spaces) process.stdout.write(`${space.name}\n`);
}

function createSpace(env: SpaceEnvironment, name: string, json: boolean): void {
  if (!name) throw new Error("usage: orch space create <name> [--json]");
  const taken = readSpaceRows(env.directory).some((space) => space.name === name);
  if (taken) throw new Error(`A space named "${name}" already exists.`);
  const id = mintAgentId();
  const now = Date.now();
  const role = env.spaceHome;
  // The home is part of what was asked for, so its failure fails the whole
  // create and leaves orch nothing to clean up.
  // The spaces row lands FIRST: `openHome` records a `space_plexers` row whose
  // foreign key names it, so opening the home before the space exists would fail
  // on a reference orch itself had not written yet.
  orm(env.directory).insert(spaces).values({ id, name, createdBy: recordableActor(env), createdAt: now }).run();
  const coordinate = openHome({
    directory: env.directory, subject: { kind: "space", id }, plexerId: env.plexerId,
    home: role, cwd: process.cwd(), label: name,
  });
  emit({ space: { id, name }, home: coordinate === null ? "none" : "created" }, `Created space "${name}".`, json);
}

function renameSpace(env: SpaceEnvironment, target: string | undefined, name: string | undefined, json: boolean): void {
  if (target === undefined || name === undefined) throw new Error("usage: orch space rename <space> <name> [--json]");
  const space = findSpace(env.directory, target);
  const taken = readSpaceRows(env.directory).some((other) => other.name === name && other.id !== space.id);
  if (taken) throw new Error(`A space named "${name}" already exists.`);
  // orch's name is orch's own write and commits first; plexer chrome is a
  // separate action whose failure never rewrites whether the rename happened.
  orm(env.directory).update(spaces).set({ name }).where(eq(spaces.id, space.id)).run();
  const role = env.spaceHome;
  const coordinate = role === null ? null : readHome(env, space.id);
  // The MARK survives a rename (E8: allowable, but never unmarked). Renaming to
  // a bare name is how a home stops reading as orch's after one edit.
  if (role !== null && coordinate !== null) role.rename(coordinate, homeLabel(name));
  emit(
    { space: { id: space.id, name }, renamed: true, home: coordinate === null ? "none" : "renamed" },
    `Renamed space "${space.name}" to "${name}".`,
    json,
  );
}

function deleteSpace(env: SpaceEnvironment, target: string | undefined, json: boolean): void {
  if (target === undefined) throw new Error("usage: orch space delete <space> [--json]");
  const space = findSpace(env.directory, target);
  const occupied = orm(env.directory).select({ agentId: agentSpaces.agentId }).from(agentSpaces)
    .where(and(eq(agentSpaces.spaceId, space.id), isNull(agentSpaces.until))).limit(1).get();
  // Nobody moves the wall out from under someone else's agents.
  if (occupied !== undefined) throw new Error(`Space "${space.name}" is not empty; move its agents out first.`);
  const role = env.spaceHome;
  const coordinate = role === null ? null : readHome(env, space.id);
  if (role !== null && coordinate !== null) role.close(coordinate);
  clearHome(env.directory, { kind: "space", id: space.id });
  orm(env.directory).delete(spaces).where(eq(spaces.id, space.id)).run();
  emit(
    { space: { id: space.id, name: space.name }, deleted: true, home: coordinate === null ? "none" : "closed" },
    `Deleted space "${space.name}".`,
    json,
  );
}

function focusSpace(env: SpaceEnvironment, target: string | undefined, json: boolean): void {
  if (target === undefined) throw new Error("usage: orch space focus <space> [--json]");
  const space = findSpace(env.directory, target);
  const role = env.spaceHome;
  const coordinate = role === null ? null : readHome(env, space.id);
  if (role === null || coordinate === null) {
    answer(space, "focus", json);
    return;
  }
  role.focus(coordinate);
  emit({ space: { id: space.id, name: space.name }, focused: true }, `Focused space "${space.name}".`, json);
}

const USAGE = "usage: orch space list|create <name>|rename <space> <name>|delete <space>|focus <space> [--json]";

/** Run one `orch space` subcommand against a resolved environment. Refusals throw;
 *  the CLI entry point below is the single place that turns one into an exit code. */
export function runSpace(env: SpaceEnvironment, args: string[]): void {
  const { enabled, positional } = splitOptionFlags(args, ["--json"]);
  const json = enabled.has("--json");
  const sub = positional[0] ?? "list";
  if (sub === "list") listSpaces(env, json);
  else if (sub === "create") createSpace(env, positional[1] ?? "", json);
  else if (sub === "rename") renameSpace(env, positional[1], positional[2], json);
  else if (sub === "delete") deleteSpace(env, positional[1], json);
  else if (sub === "focus") focusSpace(env, positional[1], json);
  else throw new Error(USAGE);
}

export function cmdSpace(args: string[]): void {
  const directory = orchDir();
  const settings = loadSettings(directory);
  const backend = resolveBackend({ configured: settings.defaults.backend ?? null });
  const env: SpaceEnvironment = {
    directory,
    plexerId: backend.id,
    spaceHome: backend.spaceHome,
    actorId: selfId() ?? null,
  };
  try {
    runSpace(env, args);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}
