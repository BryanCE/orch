import { ARROW, errorMessage } from "../../util.ts";
import { callDaemon } from "../daemon.ts";
import { displayName, placeLabel, resolveLifecycle, refuseForeignHolder, type ResolvedLifecycle } from "../resolve.ts";
import { whoAmI } from "../self.ts";
import { hostCallTimeoutMs } from "../host.ts";
import { die } from "../target.ts";
import { parseCommand } from "../registry.ts";
import { usageError } from "../../cli/usage.ts";
import type { AgentView } from "../../types/store.ts";
import type { ChromeOutcome } from "../../daemon/client/protocol.ts";
import type { WriteGovernance } from "../../types/command.ts";
import type { Services } from "../../types/services.ts";

export function renamedLine(oldName: string, newName: string, outcome: ChromeOutcome): string {
  const chrome = outcome.chrome === "failed" ? " (pane border NOT updated)" : "";
  return `Renamed ${oldName} ${ARROW} ${newName}${chrome}.`;
}

/**
 * Rename an agent: orchd writes the new name into orch's registry, then the agent's environment
 * SHOWS it, where the agent runs. One on another host is renamed by that host's orchd, in its
 * own store and pane.
 *
 * A name is ONE piece of display metadata: the border follows the name in the same verb, never
 * a second `--pane` invocation. orch's own name write commits FIRST and alone; a border that could
 * not follow is reported and never rewrites whether the rename happened.
 */
export async function renameAgent(
  services: Pick<Services, "orchDir" | "settings" | "logger">,
  resolved: Pick<ResolvedLifecycle, "key" | "view">,
  name: string,
  gov: WriteGovernance = {},
): Promise<ChromeOutcome | null> {
  const { key, view } = resolved;
  if (view === null) {
    services.logger.error("rename.unmanaged-agent", { target: key });
    process.stdout.write(`orch rename: ${key} is not an orch-spawned agent; use --pane to relabel the pane.\n`);
    return null;
  }
  const { chrome, chromeError } = await callDaemon(services, "rename", { target: key, name }, gov, hostCallTimeoutMs(services));
  if (chrome === "failed") process.stdout.write(`orch rename: named "${name}", but the pane border was not updated: ${chromeError ?? "unknown error"}\n`);
  return { chrome, chromeError };
}

function writeRenameOutput(
  targetName: string,
  handle: string,
  key: string,
  name: string,
  paneLabel: boolean,
  json: boolean,
  outcome: ChromeOutcome,
  view: AgentView | null,
): void {
  if (json) {
    process.stdout.write(JSON.stringify({
      target: handle, key, name, paneLabel, renamed: true,
      chrome: outcome.chrome, chromeError: outcome.chromeError,
    }) + "\n");
  } else if (!paneLabel && view !== null) {
    process.stdout.write(`${renamedLine(targetName, name, outcome)}\n`);
  } else {
    const chrome = outcome.chrome === "failed" ? " (pane border NOT updated)" : "";
    process.stdout.write(paneLabel
      ? `Set ${targetName}'s pane label to "${name}"${chrome}.\n`
      : `${handle} ${ARROW} named "${name}"${chrome}.\n`);
  }
}

export async function cmdRename(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("rename", args);
  const { flags, positional } = invocation;
  const paneLabel = flags.has("--pane");
  const json = flags.has("--json");
  const steal = flags.has("--steal");
  const target = positional[0];
  const name = positional[1];
  if (!target || !name) throw usageError(invocation);
  const self = await whoAmI(services);
  const resolved = await resolveLifecycle(services, target);
  const handle = placeLabel(resolved);
  const targetName = resolved.view === null ? handle : displayName(resolved.view.name, resolved.key);
  refuseForeignHolder(self, target, resolved, steal);
  const key = resolved.key;
  // Renaming an agent moves a label only: orch's registry owns the name, the
  // identity key never changes, and every session/daemon route survives it.
  // --pane relabels the backend's pane chrome instead and leaves the name alone.
  let outcome: ChromeOutcome | null = null;
  try {
    if (paneLabel) {
      // `--pane` is for deliberately giving the border something DIFFERENT. It
      // leaves orch's name alone; it is never the price of a correct display.
      // orchd labels the pane where the agent runs.
      const labelled = await callDaemon(services, "agent-pane", { target: key, action: { kind: "label", label: name } }, { steal }, hostCallTimeoutMs(services));
      if (labelled.kind === "answer") throw new Error("target environment has no pane naming role");
      outcome = { chrome: "renamed", chromeError: null };
    } else outcome = await renameAgent(services, resolved, name, { steal });
  } catch (error: unknown) {
    die(`orch rename: ${errorMessage(error)}`);
  }
  if (!outcome) {
    die(`Could not rename ${targetName}.`);
  }
  writeRenameOutput(targetName, handle, key, name, paneLabel, json, outcome, resolved.view);
}
