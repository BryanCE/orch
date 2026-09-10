// The in-agent wiring every pi-shaped harness gets: pane HUD state, the presence
// binding that writes $ORCH_DIR/agents/<KEY>/, the tool layer, and the fleet
// monitor.
//
// This file names no harness. What a harness calls itself and which event means
// "this run settled" arrive as its identity, so adding one is a composition root
// that passes different values — never a second copy of this wiring, which is the
// pair code CLAUDE.md Rule 9 forbids.
import * as fs from "node:fs";
import { createHash } from "node:crypto";
import { createDaemonClient } from "./daemon-client.ts";
import { registerFleetMonitor } from "./monitor.ts";
import { createAgentPresence } from "./presence.ts";
import { orchDir } from "../presence/writer.ts";
import { agentEnvironment, isBlockedSignal, isPaneLabels } from "./environment.ts";
import { registerAgentTools } from "./tools.ts";
import type { FleetStatusRenderer, HarnessApi, HarnessBridge, HarnessIdentity } from "../types/agent.ts";

/** The digest must stay byte-identical to computeCodeHash in src/daemon/lifecycle.ts; doctor compares the two. */
export function hashExtensionFile(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0, 12);
}

/** Bind one harness session to orch: its pane, its presence, its tools, its fleet view. */
export function registerHarnessBridge(
  harness: HarnessApi,
  identity: HarnessIdentity,
  extensionHash: string,
  ui?: { renderFleetStatus?: FleetStatusRenderer; fleet?: boolean },
): HarnessBridge {
  // This bridge knows no plexer. What its environment composes was decided by
  // orch at spawn and stamped into the launch env; what its environment KNOWS is
  // answered by orchd, the one process that talks to a plexer at all.
  const environment = agentEnvironment();
  const daemon = createDaemonClient(orchDir());

  const presence = createAgentPresence({ harness, identity, extensionHash, daemon });

  async function refreshLabels(): Promise<void> {
    if (!environment.labels) return;
    const labels = await daemon.ask("environment-labels", { id: identity.agentId });
    if (!isPaneLabels(labels)) return;
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
    notify: (event) => { void daemon.ask("notify", { ...event }); },
    refreshLabels,
  });

  // The environment names its own blocked signal; the bridge only listens for
  // whatever it was told. An environment that raises none names none.
  if (environment.blockedEvent !== null) {
    harness.events.on(environment.blockedEvent, (data: unknown) => {
      if (!isBlockedSignal(data)) return;
      onBlockedChange(data.active, data.label);
    });
  }
  // A session that orchestrates also watches: one daemon subscription for the
  // whole session, so a worker going blocked surfaces instead of being polled for.
  // The model only ever contains agents THIS session spawned; for everyone else
  // it stays empty and renders nothing.
  // A composition root that ships its own orchestrator seat opts out of the
  // generic status line so exactly one writer owns the fleet surface.
  const fleet = ui?.fleet === false
    ? undefined
    : registerFleetMonitor(harness, orchDir(), {
        ownKey: (context) => presence.ownPresenceKey(context) || undefined,
        renderStatus: ui?.renderFleetStatus,
      });
  return { fleet, ownKey: () => presence.state.key || undefined };
}
