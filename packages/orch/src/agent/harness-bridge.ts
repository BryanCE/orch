import type { OrchDir } from "../types/core.ts";
// The in-agent wiring every pi-shaped harness gets: pane HUD state, the presence
// binding, and the tool layer. The orchestrator seat is the composition root's.
//
// This file names no harness. What a harness calls itself and which event means
// "this run settled" arrive as its identity, so adding one is a composition root
// that passes different values — never a second copy of this wiring, which is the
// pair code CLAUDE.md Rule 9 forbids.
import * as fs from "node:fs";
import { createHash } from "node:crypto";
import { createDaemonLink } from "./daemon-client.ts";
import { createAgentPresence } from "./presence.ts";
import { agentEnvironment, isBlockedSignal } from "./environment.ts";
import { registerAgentTools } from "./tools.ts";
import type { HarnessApi, HarnessBridge, HarnessIdentity } from "../types/agent.ts";
import type { SettingsManager } from "../types/services.ts";

/** The digest must stay byte-identical to computeCodeHash in src/daemon/lifecycle.ts; doctor compares the two. */
export function hashExtensionFile(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0, 12);
}

/** Bind one harness session to orch: its pane, its presence, its tools. */
export function registerHarnessBridge(
  harness: HarnessApi,
  identity: HarnessIdentity,
  extensionHash: string,
  options: { orchDir: OrchDir; settings: SettingsManager },
): HarnessBridge {
  // This bridge knows no plexer. What its environment composes was decided by
  // orch at spawn and stamped into the launch env; what its environment KNOWS is
  // answered by orchd, the one process that talks to a plexer at all.
  const environment = agentEnvironment();
  const daemon = createDaemonLink(options.orchDir, options.settings);

  const presence = createAgentPresence({ harness, identity, extensionHash, daemon });

  async function refreshLabels(): Promise<void> {
    if (!environment.labels) return;
    const labels = await daemon.ask("environment-labels", { id: identity.agentId });
    if (labels === undefined || labels === null) return;
    // A live pane label refines the name; an unlabeled pane never erases the
    // launch-stamped one.
    if (labels.label) presence.state.label = labels.label;
    presence.state.tabLabel = labels.tabLabel;
    presence.writeStatus();
  }

  const { onBlockedChange } = registerAgentTools(harness, {
    presence,
    daemon,
    identity,
    notify: (event) => {
      void daemon.ask("notify", event);
    },
    refreshLabels,
  }, options.orchDir, options.settings);

  // The environment names its own blocked signal; the bridge only listens for
  // whatever it was told. An environment that raises none names none.
  if (environment.blockedEvent !== null) {
    harness.events.on(environment.blockedEvent, (data: unknown) => {
      if (!isBlockedSignal(data)) return;
      onBlockedChange(data.active, data.label);
    });
  }
  return { ownKey: () => presence.state.key || undefined };
}
