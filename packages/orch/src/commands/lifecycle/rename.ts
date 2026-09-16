import { isAgentId } from "../../backends/identity.ts";
import { assertNameFree } from "../../policy/name.ts";
import { errorMessage } from "../../util.ts";
import { callDaemon } from "../daemon.ts";
import { readFleet } from "../fleet.ts";
import { admissionFleet } from "../spawn/admission.ts";
import { lifecycleLogger } from "./index.ts";
import { describeHandle } from "./close.ts";
import { assertAgentOwned, backendTarget, die } from "../target.ts";
import { parseCommand } from "../registry.ts";
import { viewForKey } from "../../entities/lookup.ts";
import type { Backend, BackendHandle } from "../../types/backend.ts";
import type { AgentView } from "../../types/store.ts";
import type { PresenceEntry } from "../../types/presence.ts";
import type { Services } from "../../types/services.ts";

interface ChromeOutcome {
  readonly chrome: "renamed" | "none" | "failed";
  readonly chromeError: string | null;
}

/**
 * Write the new label into orch's registry, then let the plexer SHOW it.
 *
 * This used to relabel the agent and leave the pane BORDER reading the old name,
 * because a separate `--pane` invocation set the border — two names for one fact,
 * which Rule 9 forbids and a name is ONE piece of display metadata.
 * The operator watches the panes; a stale border is worse than an ordinal
 * because it actively lies about which worker holds which slice.
 *
 * orch's own name write commits FIRST and alone. The chrome is a separate action
 * whose failure is reported and never rewrites whether the rename happened
 * The response states the two outcomes separately.
 */
async function renameAgent(
  services: Pick<Services, "orchDir" | "settings" | "logger">,
  backend: Backend,
  handle: BackendHandle,
  key: string,
  name: string,
  views: ReadonlyMap<string, AgentView>,
  presence: ReadonlyMap<string, PresenceEntry>,
): Promise<ChromeOutcome | null> {
  const view = viewForKey(views, key);
  if (!view) {
    lifecycleLogger(services.logger, key).error("rename.unmanaged-agent", { target: key });
    process.stdout.write(`orch rename: ${key} is not an orch-spawned agent; use --pane to relabel the pane.\n`);
    return null;
  }
  assertNameFree(views, presence, name, view.environment.space);
  if (!isAgentId(key)) return null;
  await callDaemon(services, "rename", { target: key, name });
  const role = backend.agentNaming;
  if (!role) throw new Error("target environment has no agent naming role");
  role.renameAgent(handle, name);
  // The border follows the name in the SAME command. An environment with no
  // pane naming has no border to sync, which is an answer, not a failure (E14).
  const labeling = backend.labeling;
  if (!labeling) return { chrome: "none", chromeError: null };
  try {
    labeling.setLabel(handle, name);
    return { chrome: "renamed", chromeError: null };
  } catch (error: unknown) {
    const message = errorMessage(error);
    lifecycleLogger(services.logger, key).warn("rename.chrome-failed", { handle: describeHandle(handle), error: message });
    process.stdout.write(`orch rename: named "${name}", but the pane border was not updated: ${message}\n`);
    return { chrome: "failed", chromeError: message };
  }
}

export async function cmdRename(services: Services, args: string[]): Promise<void> {
  const { flags, positional } = parseCommand("rename", args);
  const paneLabel = flags.has("--pane");
  const json = flags.has("--json");
  const force = flags.has("--force");
  const target = positional[0];
  const name = positional[1];
  if (!target || !name) die("usage: orch rename <target> <name> [--pane] [--force]");
  const { views, presence } = admissionFleet(await readFleet(services, true));
  const { backend, handle, key } = backendTarget(services.orchDir, services.settings.current(), target, "rename", views);
  assertAgentOwned(services.orchDir, target, { key }, force, views);
  // Renaming an agent moves a label only: orch's registry owns the name, the
  // identity key never changes, and every session/daemon route survives it.
  // --pane relabels the backend's pane chrome instead and leaves the name alone.
  let outcome: ChromeOutcome | null = null;
  try {
    if (paneLabel) {
      // `--pane` is for deliberately giving the border something DIFFERENT. It
      // leaves orch's name alone; it is never the price of a correct display.
      if (!backend.labeling) throw new Error("target environment has no pane naming role");
      backend.labeling.setLabel(handle, name);
      outcome = { chrome: "renamed", chromeError: null };
    } else outcome = await renameAgent(services, backend, handle, key, name, views, presence);
  } catch (error: unknown) {
    die(`orch rename: ${errorMessage(error)}`);
  }
  if (!outcome) die(`Could not rename ${handle}.`);
  if (json) {
    process.stdout.write(JSON.stringify({
      target: handle, key, name, paneLabel, renamed: true,
      chrome: outcome.chrome, chromeError: outcome.chromeError,
    }) + "\n");
  } else {
    const chrome = outcome.chrome === "failed" ? " (pane border NOT updated)" : "";
    process.stdout.write(`${handle} -> ${paneLabel ? "pane label" : "named"} "${name}"${chrome}.\n`);
  }
}
