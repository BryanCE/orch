import { askDaemon, callDaemon } from "./daemon.ts";
import { die } from "./target.ts";
import { parseCommand } from "./registry.ts";
import { usageError } from "../cli/usage.ts";
import { requiredWord } from "./panes.ts";
import { errorMessage } from "../util.ts";
import type { DaemonClient, Services } from "../types/services.ts";

/**
 * `orch space` — orch's OWN grouping of work.
 *
 * A space is user-created, optional and identified by a name orch owns. It is
 * NOT a plexer's workspace: creating, renaming, listing and deleting one are
 * orchd's writes and work in every environment, including one with no screen.
 *
 * A plexer may additionally HOLD that space — a home. orchd drives it in the
 * plexer settings name, on this machine. The coordinate it hands back is
 * recorded by orchd and is never displayed (E10).
 *
 * Only `focus` genuinely needs the home, so only `focus` can be answered with an
 * absence, and that answer names the space and the verb (E14) and exits zero.
 */

function emit(value: unknown, text: string, json: boolean): void {
  process.stdout.write(json ? JSON.stringify(value) + "\n" : text + "\n");
}

async function listSpaces(services: DaemonClient, json: boolean): Promise<void> {
  const listed = await askDaemon(services, "spaces", undefined);
  const spaces = listed.spaces.map((space) => ({ id: space.id, name: space.name, home: space.home !== null }));
  if (json) {
    process.stdout.write(JSON.stringify({ spaces }, null, 2) + "\n");
    return;
  }
  if (spaces.length === 0) process.stdout.write("No spaces.\n");
  else for (const space of spaces) process.stdout.write(`${space.name}\n`);
}

async function createSpace(services: DaemonClient, name: string, json: boolean): Promise<void> {
  const created = await callDaemon(services, "space-create", { name, cwd: process.cwd() });
  emit({ space: { id: created.id, name: created.name }, home: created.home }, `Created space "${name}".`, json);
}

async function renameSpace(services: DaemonClient, target: string, name: string, json: boolean): Promise<void> {
  const renamed = await callDaemon(services, "space-rename", { target, name });
  emit(
    { space: { id: renamed.id, name }, renamed: true, home: renamed.home },
    `Renamed space "${renamed.previousName}" to "${name}".`,
    json,
  );
}

async function deleteSpace(services: DaemonClient, target: string, json: boolean): Promise<void> {
  // orchd refuses an occupied space before any plexer window closes.
  const deleted = await callDaemon(services, "space-delete", { target });
  emit({ space: { id: deleted.id, name: deleted.name }, deleted: true, home: deleted.home }, `Deleted space "${deleted.name}".`, json);
}

async function focusSpace(services: DaemonClient, target: string, json: boolean): Promise<void> {
  const focused = await askDaemon(services, "space-focus", { target });
  // An absence is an answer to whoever asked, never a failure (E14).
  if (focused.outcome === "answer") {
    emit(focused, focused.text, json);
    return;
  }
  emit({ space: focused.space, focused: true }, `Focused space "${focused.space.name}".`, json);
}

/** Run one `orch space` subcommand. Refusals throw; {@link cmdSpace} is the single place that
 *  turns one into an exit code. */
export async function runSpace(services: DaemonClient, args: string[]): Promise<void> {
  const invocation = parseCommand("space", args);
  const json = invocation.flags.has("--json");
  switch (invocation.command.name) {
    case "create": return createSpace(services, requiredWord(invocation, 0), json);
    case "rename": return renameSpace(services, requiredWord(invocation, 0), requiredWord(invocation, 1), json);
    case "delete": return deleteSpace(services, requiredWord(invocation, 0), json);
    case "focus": return focusSpace(services, requiredWord(invocation, 0), json);
    default:
      if (invocation.positional.length) throw usageError(invocation);
      return listSpaces(services, json);
  }
}

export async function cmdSpace(services: Services, args: string[]): Promise<void> {
  try {
    await runSpace(services, args);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}
