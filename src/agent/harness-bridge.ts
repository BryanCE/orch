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
import { activePaneHud } from "../backends/hud.ts";
import { createDaemonAck } from "./daemon-ack.ts";
import { registerFleetMonitor } from "./monitor.ts";
import { createAgentPresence } from "./presence.ts";
import { orchDir } from "../presence/writer.ts";
import { registerAgentTools } from "./tools.ts";
import { isRecord } from "../util.ts";
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
  const hud = activePaneHud();
  const paneId = hud.paneHandle;

  hud.registerPaneState(
    {
      onSessionStart: (handler) => harness.on("session_start", (_event, ctx) => handler(ctx)),
      onAgentStart: (handler) => harness.on("agent_start", (_event, ctx) => handler(ctx)),
      onAgentEnd: (handler) => harness.on("agent_end", (event) => {
        if (!isRecord(event)) return;
        const messages = event.messages;
        if (messages !== undefined && !Array.isArray(messages)) return;
        handler({ messages });
      }),
      onSessionShutdown: (handler) => harness.on("session_shutdown", (event) => {
        if (!isRecord(event)) return;
        const reason = event.reason;
        if (reason !== undefined && typeof reason !== "string") return;
        // The handler is fire-and-forget by contract: a shutdown notice has no
        // caller left to await it.
        void handler({ reason });
      }),
    },
    harness.events,
    { agentId: identity.agentId, extensionHash },
  );

  const presence = createAgentPresence({
    harness,
    identity,
    paneId,
    extensionHash,
    ack: createDaemonAck(orchDir()),
    reportStatus: hud.statusReporter(paneId),
  });

  async function refreshLabels(): Promise<void> {
    const applied = await hud.readLabels((labels) => {
      // A live pane label refines the name; an unlabeled pane never erases the
      // launch-stamped one.
      if (labels.label) presence.state.label = labels.label;
      presence.state.tabLabel = labels.tabLabel;
    });
    if (applied) presence.writeStatus();
  }

  const { onBlockedChange } = registerAgentTools(harness, {
    presence,
    identity,
    notify: hud.notify,
    refreshLabels,
  });

  hud.registerBlockedRelay(harness.events, onBlockedChange);
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
