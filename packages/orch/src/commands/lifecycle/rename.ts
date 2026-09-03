import { tryParseIdentity } from "../../backends/identity.ts";
import { orchDir } from "../../presence/writer.ts";
import { assertNameFree } from "../../policy/name.ts";
import { renameAgent as renameNormalizedAgent } from "../../store/agent-rows.ts";
import { errorMessage } from "../../util.ts";
import { lifecycleLogger } from "./index.ts";
import { describeHandle } from "./close.ts";
import { agentViewIndex, assertAgentOwned, backendTarget, die, viewForKey } from "../target.ts";
import type { Backend, BackendHandle } from "../../types/backend.ts";
import type { AgentView } from "../../types/store.ts";

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
function renameAgent(
  backend: Backend,
  handle: BackendHandle,
  key: string,
  name: string,
  views: ReadonlyMap<string, AgentView>,
): ChromeOutcome | null {
  const view = viewForKey(views, key);
  if (!view) {
    lifecycleLogger(key).error("rename.unmanaged-agent", { target: key });
    process.stdout.write(`orch rename: ${key} is not an orch-spawned agent; use --pane to relabel the pane.\n`);
    return null;
  }
  assertNameFree(name, view.environment.space ?? "");
  const identity = tryParseIdentity(key);
  if (!identity || !renameNormalizedAgent(orchDir(), identity.id, name)) return null;
  const role = backend.agentNaming;
  if (!role) throw new Error("target environment has no agent naming role");
  role.renameAgent(handle, name);
  // The border follows the name in the SAME command. An environment with no
  // pane naming has no border to sync, which is an answer, not a failure (E14).
  const paneNaming = backend.paneNaming;
  if (!paneNaming) return { chrome: "none", chromeError: null };
  try {
    paneNaming.renamePane(handle, name);
    return { chrome: "renamed", chromeError: null };
  } catch (error: unknown) {
    const message = errorMessage(error);
    lifecycleLogger(key).warn("rename.chrome-failed", { handle: describeHandle(handle), error: message });
    process.stdout.write(`orch rename: named "${name}", but the pane border was not updated: ${message}\n`);
    return { chrome: "failed", chromeError: message };
  }
}

export function cmdRename(args: string[]) {
  const paneLabel = args.includes("--pane");
  const json = args.includes("--json");
  const force = args.includes("--force");
  const positional = args.filter((arg) => arg !== "--pane" && arg !== "--json" && arg !== "--force");
  const target = positional[0];
  const name = positional[1];
  if (!target || !name) die("usage: orch rename <target> <name> [--pane] [--force]");
  const views = agentViewIndex();
  const { backend, handle, key } = backendTarget(target, "rename", views);
  assertAgentOwned(target, { key }, force, views);
  // Renaming an agent moves a label only: orch's registry owns the name, the
  // identity key never changes, and every session/daemon route survives it.
  // --pane relabels the backend's pane chrome instead and leaves the name alone.
  let outcome: ChromeOutcome | null = null;
  try {
    if (paneLabel) {
      // `--pane` is for deliberately giving the border something DIFFERENT. It
      // leaves orch's name alone; it is never the price of a correct display.
      if (!backend.paneNaming) throw new Error("target environment has no pane naming role");
      backend.paneNaming.renamePane(handle, name);
      outcome = { chrome: "renamed", chromeError: null };
    } else outcome = renameAgent(backend, handle, key, name, views);
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
