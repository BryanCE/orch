import { resolveBackend } from "../backends/registry.ts";
import { askDaemon, callDaemon } from "./daemon.ts";
import { homeLabel, openHome } from "./home.ts";
import { die } from "./target.ts";
import { parseCommand } from "./registry.ts";
import { errorMessage } from "../util.ts";
import type { SpaceHomeRole } from "../types/backend.ts";
import type { SpaceEnvironment } from "../types/command.ts";
import type { Services } from "../types/services.ts";
import type { SpaceListing, SpaceRow } from "../types/store.ts";

/**
 * `orch space` — orch's OWN grouping of work.
 *
 * A space is user-created, optional and identified by a name orch owns. It is
 * NOT a plexer's workspace: creating, renaming, listing and deleting one are
 * orchd's writes and work in every environment, including one with no screen.
 *
 * A plexer may additionally HOLD that space — a home.
 * That is an environment role, composed only by a plexer that implements it
 * completely; `spaceHome === null` IS the absence (E13), never a probe. The
 * coordinate it hands back is recorded by orchd and is never displayed
 * (E10) — printing one is how `wF` came to be shown as a name a human chose.
 *
 * Only `focus` genuinely needs the home, so only `focus` can be answered with an
 * absence, and that answer names the space and the verb (E14) and exits zero.
 */

interface BoundaryAnswer {
  readonly outcome: "answer";
  readonly text: string;
  readonly reason: "no-pane" | "no-environment-role";
}

function emit(value: unknown, text: string, json: boolean): void {
  process.stdout.write(json ? JSON.stringify(value) + "\n" : text + "\n");
}

/** An absence is an answer to whoever asked, never a failure (E14). */
function answer(space: SpaceRow, verb: string, json: boolean): void {
  const plan: BoundaryAnswer = {
    outcome: "answer",
    reason: "no-environment-role",
    text: `${space.name} has no home in this environment; ${verb} does not apply.`,
  };
  emit(plan, plan.text, json);
}

interface DrivableHome {
  readonly role: SpaceHomeRole;
  readonly coordinate: string;
}

/** The home this environment can drive: a recorded coordinate is only one when
 *  this plexer composes the role that opened it. */
function drivableHome(env: SpaceEnvironment, space: SpaceListing): DrivableHome | null {
  if (env.spaceHome === null || space.home === null) return null;
  return { role: env.spaceHome, coordinate: space.home };
}

async function listSpaces(env: SpaceEnvironment, json: boolean): Promise<void> {
  const listed = await askDaemon(env.services, "spaces", { plexerId: env.plexerId });
  const spaces = listed.spaces.map((space) => ({ id: space.id, name: space.name, home: space.home !== null }));
  if (json) {
    process.stdout.write(JSON.stringify({ spaces }, null, 2) + "\n");
    return;
  }
  if (spaces.length === 0) process.stdout.write("No spaces.\n");
  else for (const space of spaces) process.stdout.write(`${space.name}\n`);
}

async function createSpace(env: SpaceEnvironment, name: string, json: boolean): Promise<void> {
  if (!name) throw new Error("usage: orch space create <name> [--json]");
  // The spaces row lands FIRST: the home row's foreign key names it. The home is
  // part of what was asked for, so its failure fails the whole create.
  const space = await callDaemon(env.services, "space-create", { name });
  const role = env.spaceHome;
  if (role !== null) {
    await openHome({ services: env.services, subject: { kind: "space", id: space.id }, plexerId: env.plexerId, home: role, cwd: process.cwd(), label: name });
  }
  emit({ space, home: role === null ? "none" : "created" }, `Created space "${name}".`, json);
}

async function renameSpace(env: SpaceEnvironment, target: string | undefined, name: string | undefined, json: boolean): Promise<void> {
  if (target === undefined || name === undefined) throw new Error("usage: orch space rename <space> <name> [--json]");
  // orch's name is orch's own write and commits first; plexer chrome is a
  // separate action whose failure never rewrites whether the rename happened.
  const renamed = await callDaemon(env.services, "space-rename", { target, name, plexerId: env.plexerId });
  const home = drivableHome(env, renamed);
  // The MARK survives a rename (E8: allowable, but never unmarked). Renaming to
  // a bare name is how a home stops reading as orch's after one edit.
  if (home !== null) home.role.rename(home.coordinate, homeLabel(name));
  emit(
    { space: { id: renamed.id, name }, renamed: true, home: home === null ? "none" : "renamed" },
    `Renamed space "${renamed.previousName}" to "${name}".`,
    json,
  );
}

async function deleteSpace(env: SpaceEnvironment, target: string | undefined, json: boolean): Promise<void> {
  if (target === undefined) throw new Error("usage: orch space delete <space> [--json]");
  // orchd refuses an occupied space before any plexer window closes.
  const deleted = await callDaemon(env.services, "space-delete", { target, plexerId: env.plexerId });
  const home = drivableHome(env, deleted);
  if (home !== null) home.role.close(home.coordinate);
  emit(
    { space: { id: deleted.id, name: deleted.name }, deleted: true, home: home === null ? "none" : "closed" },
    `Deleted space "${deleted.name}".`,
    json,
  );
}

async function focusSpace(env: SpaceEnvironment, target: string | undefined, json: boolean): Promise<void> {
  if (target === undefined) throw new Error("usage: orch space focus <space> [--json]");
  const space = await askDaemon(env.services, "space", { target, plexerId: env.plexerId });
  const home = drivableHome(env, space);
  if (home === null) {
    answer(space, "focus", json);
    return;
  }
  home.role.focus(home.coordinate);
  emit({ space: { id: space.id, name: space.name }, focused: true }, `Focused space "${space.name}".`, json);
}

const USAGE = "usage: orch space list|create <name>|rename <space> <name>|delete <space>|focus <space> [--json]";

/** Run one `orch space` subcommand against a resolved environment. Refusals throw;
 *  the CLI entry point below is the single place that turns one into an exit code. */
export async function runSpace(env: SpaceEnvironment, args: string[]): Promise<void> {
  const { command, flags, positional } = parseCommand("space", args);
  const json = flags.has("--json");
  switch (command.name) {
    case "create": return createSpace(env, positional[0] ?? "", json);
    case "rename": return renameSpace(env, positional[0], positional[1], json);
    case "delete": return deleteSpace(env, positional[0], json);
    case "focus": return focusSpace(env, positional[0], json);
    case "list": return listSpaces(env, json);
    default:
      if (positional.length) throw new Error(USAGE);
      return listSpaces(env, json);
  }
}

export async function cmdSpace(services: Services, args: string[]): Promise<void> {
  const settings = services.settings.current();
  const backend = resolveBackend({ configured: settings.defaults.backend ?? null });
  const env: SpaceEnvironment = { services, plexerId: backend.id, spaceHome: backend.spaceHome };
  try {
    await runSpace(env, args);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}
